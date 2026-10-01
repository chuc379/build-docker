import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { FieldMetadataType } from 'twenty-shared/types';

import { FilesFieldService } from 'src/engine/core-modules/file/files-field/services/files-field.service';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';

// Reserved key on a CODE step input. When present, every entry is downloaded
// over plain HTTP and archived in the workspace storage, then replaced by the
// `{ fileId, label }` items a FILES field expects.
export const REMOTE_FILES_INPUT_KEY = 'remoteFiles';

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
  }): Promise<RemoteFileItem[]> {
    if (!Array.isArray(requests)) {
      return [];
    }

    const items: RemoteFileItem[] = [];

    for (const request of requests) {
      const item = await this.archiveRemoteFile({
        request: request as RemoteFileRequest,
        workspaceId,
      });

      if (isDefined(item)) {
        items.push(item);
      }
    }

    return items;
  }

  private async archiveRemoteFile({
    request,
    workspaceId,
  }: {
    request: RemoteFileRequest;
    workspaceId: string;
  }): Promise<RemoteFileItem | null> {
    const url = this.toNonEmptyString(request.url);
    const objectNameSingular = this.toNonEmptyString(
      request.objectNameSingular,
    );
    const fieldName = this.toNonEmptyString(request.fieldName);

    if (!url || !objectNameSingular || !fieldName) {
      this.logger.warn(
        'Skipped remote file: url, objectNameSingular and fieldName are required',
      );

      return null;
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
        fieldMetadataUniversalIdentifier: fieldMetadata.universalIdentifier,
      });

      // The FILES field shows `label` to HR, so it must be the original file
      // name, not the opaque storage id.
      return { fileId: uploadedFile.id, label: filename };
    } catch (error) {
      this.logger.warn(
        `Could not archive remote file ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return null;
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
        `Field "${objectNameSingular}.${fieldName}" is not a FILES field`,
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
