import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { FieldMetadataType } from 'twenty-shared/types';

import { FilesFieldService } from 'src/engine/core-modules/file/files-field/services/files-field.service';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';

// Reserved input key on a CODE step. Its entries are downloaded over plain HTTP
// and archived in the workspace storage before the logic function runs, so the
// one-time intake link is consumed exactly once. The archived items and a
// human-readable outcome are exposed on the step output by the CODE action.
export const REMOTE_FILES_INPUT_KEY = 'remoteFiles';
export const REMOTE_FILES_OUTPUT_KEY = 'archivedFiles';
export const REMOTE_FILES_NOTE_OUTPUT_KEY = 'remoteFilesNote';

export type RemoteFileRequest = {
  url?: unknown;
  filename?: unknown;
  objectNameSingular?: unknown;
  fieldName?: unknown;
};

export type RemoteFileItem = {
  fileId: string;
  label: string;
};

export type RemoteFilesArchiveResult = {
  items: RemoteFileItem[];
  errors: string[];
  attempted: number;
};

@Injectable()
export class RemoteFilesFieldService {
  private readonly logger = new Logger(RemoteFilesFieldService.name);

  // Intake services hand out links that expire in minutes, so the download has
  // to be quick and bounded: a CV is a few hundred KB, never more.
  private static readonly DOWNLOAD_TIMEOUT_MS = 15_000;
  private static readonly MAX_REMOTE_FILE_BYTES = 25 * 1024 * 1024;
  private static readonly FALLBACK_FILENAME = 'cv.pdf';

  constructor(
    private readonly filesFieldService: FilesFieldService,
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly fieldMetadataService: FieldMetadataService,
  ) {}

  async archiveRemoteFiles({
    requests,
    workspaceId,
  }: {
    requests: unknown;
    workspaceId: string;
  }): Promise<RemoteFilesArchiveResult> {
    if (!Array.isArray(requests)) {
      return { items: [], errors: [], attempted: 0 };
    }

    const items: RemoteFileItem[] = [];
    const errors: string[] = [];

    for (const request of requests) {
      const result = await this.archiveRemoteFile({
        request: request as RemoteFileRequest,
        workspaceId,
      });

      if (isDefined(result.item)) {
        items.push(result.item);
      }

      if (isDefined(result.error)) {
        errors.push(result.error);
      }
    }

    return { items, errors, attempted: requests.length };
  }

  private async archiveRemoteFile({
    request,
    workspaceId,
  }: {
    request: RemoteFileRequest;
    workspaceId: string;
  }): Promise<{ item: RemoteFileItem | null; error?: string }> {
    const url = this.toNonEmptyString(request.url);
    const objectNameSingular = this.toNonEmptyString(
      request.objectNameSingular,
    );
    const fieldName = this.toNonEmptyString(request.fieldName);

    if (!url || !objectNameSingular || !fieldName) {
      const error = `missing url, objectNameSingular or fieldName (url=${
        url ?? 'undefined'
      })`;

      this.logger.warn(`Could not archive remote file: ${error}`);

      return { item: null, error };
    }

    try {
      const fieldMetadata = await this.findFilesFieldOrThrow({
        workspaceId,
        objectNameSingular,
        fieldName,
      });

      const { buffer, filename } = await this.downloadRemoteFile({
        url,
        requestedFilename: this.toNonEmptyString(request.filename),
      });

      const uploadedFile = await this.filesFieldService.uploadFile({
        file: buffer,
        filename,
        workspaceId,
        fieldMetadataId: fieldMetadata.id,
        fieldMetadataUniversalIdentifier: fieldMetadata.universalIdentifier,
      });

      this.logger.log(
        `Archived remote file ${filename} (${buffer.length} bytes) into ${objectNameSingular}.${fieldName} as ${uploadedFile.id}`,
      );

      // The FILES field shows `label` to HR, so it must be the original file
      // name, not the opaque storage id.
      return { item: { fileId: uploadedFile.id, label: filename } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Could not archive remote file ${url}: ${message}`);

      return { item: null, error: message };
    }
  }

  private async findFilesFieldOrThrow({
    workspaceId,
    objectNameSingular,
    fieldName,
  }: {
    workspaceId: string;
    objectNameSingular: string;
    fieldName: string;
  }) {
    const objectMetadata =
      await this.objectMetadataService.findOneWithinWorkspace(workspaceId, {
        where: { nameSingular: objectNameSingular },
      });

    if (!isDefined(objectMetadata)) {
      throw new Error(`Object "${objectNameSingular}" not found`);
    }

    const fieldMetadata =
      await this.fieldMetadataService.findOneWithinWorkspace(workspaceId, {
        where: { objectMetadataId: objectMetadata.id, name: fieldName },
      });

    if (!isDefined(fieldMetadata)) {
      throw new Error(`Field "${objectNameSingular}.${fieldName}" not found`);
    }

    if (fieldMetadata.type !== FieldMetadataType.FILES) {
      throw new Error(
        `Field "${objectNameSingular}.${fieldName}" is not a FILES field (found: ${fieldMetadata.type})`,
      );
    }

    return fieldMetadata;
  }

  private async downloadRemoteFile({
    url,
    requestedFilename,
  }: {
    url: string;
    requestedFilename: string | undefined;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(RemoteFilesFieldService.DOWNLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);

    if (
      isDefined(declaredLength) &&
      declaredLength > RemoteFilesFieldService.MAX_REMOTE_FILE_BYTES
    ) {
      throw new Error(
        `Declared size ${declaredLength} exceeds the ${RemoteFilesFieldService.MAX_REMOTE_FILE_BYTES} bytes limit`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty');
    }

    if (buffer.length > RemoteFilesFieldService.MAX_REMOTE_FILE_BYTES) {
      throw new Error(
        `Downloaded size ${buffer.length} exceeds the ${RemoteFilesFieldService.MAX_REMOTE_FILE_BYTES} bytes limit`,
      );
    }

    return {
      buffer,
      filename: this.resolveFilename({
        url,
        requestedFilename,
      }),
    };
  }

  private resolveFilename({
    url,
    requestedFilename,
  }: {
    url: string;
    requestedFilename: string | undefined;
  }): string {
    if (isDefined(requestedFilename)) {
      return requestedFilename;
    }

    try {
      const { pathname } = new URL(url);
      const lastSegment = pathname.split('/').filter(Boolean).pop();

      if (isDefined(lastSegment) && lastSegment.includes('.')) {
        return decodeURIComponent(lastSegment);
      }
    } catch {
      // fall through to the default name
    }

    return RemoteFilesFieldService.FALLBACK_FILENAME;
  }

  private toNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : undefined;
  }
}
