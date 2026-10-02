import { Test, type TestingModule } from '@nestjs/testing';

import { FieldMetadataType } from 'twenty-shared/types';

import { FilesFieldService } from 'src/engine/core-modules/file/files-field/services/files-field.service';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { RemoteFilesFieldService } from 'src/modules/workflow/workflow-executor/workflow-actions/code/services/remote-files-field.service';

const FILES_FIELD_METADATA = {
  id: 'field-id',
  name: 'cvfile',
  universalIdentifier: 'field-uid',
  type: FieldMetadataType.FILES,
};

const mockOkResponse = (bytes: number, contentType = 'application/pdf') =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map<string, string>([
      ['content-type', contentType],
      ['content-length', String(bytes)],
    ]),
    arrayBuffer: async () => Buffer.alloc(bytes, 0x61),
  }) as unknown as Response;

// A minimal but genuinely valid PDF body, enough for `file-type` to sniff it.
const PDF_BODY = Buffer.from(
  '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
  'latin1',
);

const mockPdfResponse = (buffer: Buffer) =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map<string, string>([
      ['content-type', 'application/pdf'],
      ['content-length', String(buffer.length)],
    ]),
    arrayBuffer: async () =>
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
  }) as unknown as Response;

describe('RemoteFilesFieldService', () => {
  let service: RemoteFilesFieldService;
  let mockUploadFile: jest.Mock;
  let mockFindOneWithinWorkspace: jest.Mock;
  let mockObjectMetadataFind: jest.Mock;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;

    mockUploadFile = jest.fn().mockResolvedValue({ id: 'stored-file-id' });
    mockFindOneWithinWorkspace = jest
      .fn()
      .mockResolvedValue(FILES_FIELD_METADATA);
    mockObjectMetadataFind = jest.fn().mockResolvedValue({ id: 'object-id' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoteFilesFieldService,
        {
          provide: FilesFieldService,
          useValue: { uploadFile: mockUploadFile },
        },
        {
          provide: FieldMetadataService,
          useValue: { findOneWithinWorkspace: mockFindOneWithinWorkspace },
        },
        {
          provide: ObjectMetadataService,
          useValue: { findOneWithinWorkspace: mockObjectMetadataFind },
        },
      ],
    }).compile();

    service = module.get(RemoteFilesFieldService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('downloads the short-lived link and uploads it to the FILES field', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockOkResponse(2048),
      ) as unknown as typeof globalThis.fetch;

    const result = await service.archiveRemoteFiles({
      workspaceId: 'workspace-1',
      requests: [
        {
          url: 'https://intake.example.com/cv/abc',
          filename: 'Nguyen-Van-A.pdf',
          objectNameSingular: 'candidate',
          fieldName: 'cvfile',
        },
      ],
    });

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'Nguyen-Van-A.pdf',
        workspaceId: 'workspace-1',
        fieldMetadataUniversalIdentifier: 'field-uid',
      }),
    );
    expect(result).toEqual({
      items: [{ fileId: 'stored-file-id', label: 'Nguyen-Van-A.pdf' }],
      errors: [],
      attempted: 1,
    });
  });

  it('falls back to the file name in the URL path when none is given', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockOkResponse(10),
      ) as unknown as typeof globalThis.fetch;

    const result = await service.archiveRemoteFiles({
      workspaceId: 'workspace-1',
      requests: [
        {
          url: 'https://intake.example.com/files/cv-42.docx',
          objectNameSingular: 'candidate',
          fieldName: 'cvfile',
        },
      ],
    });

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'cv-42.docx' }),
    );
    expect(result.items[0].label).toBe('cv-42.docx');
  });

  it('does nothing when the step has no remote file input', async () => {
    globalThis.fetch = jest.fn() as unknown as typeof globalThis.fetch;

    await expect(
      service.archiveRemoteFiles({
        workspaceId: 'workspace-1',
        requests: undefined,
      }),
    ).resolves.toEqual({ items: [], errors: [], attempted: 0 });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('skips the upload and keeps the workflow running when the link already expired', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Map<string, string>(),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    await expect(
      service.archiveRemoteFiles({
        workspaceId: 'workspace-1',
        requests: [
          {
            url: 'https://intake.example.com/cv/expired',
            objectNameSingular: 'candidate',
            fieldName: 'cvfile',
          },
        ],
      }),
    ).resolves.toEqual({
      items: [],
      errors: ['HTTP 403 Forbidden'],
      attempted: 1,
    });
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('trims the stray newline TopCV puts before the %PDF header', async () => {
    const withStrayNewline = Buffer.concat([
      Buffer.from('\n', 'latin1'),
      PDF_BODY,
    ]);

    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockPdfResponse(withStrayNewline),
      ) as unknown as typeof globalThis.fetch;

    const result = await service.archiveRemoteFiles({
      workspaceId: 'workspace-1',
      requests: [
        {
          url: 'https://intake.example.com/cv/abc',
          objectNameSingular: 'candidate',
          fieldName: 'cvfile',
          filename: 'Nguyen-Van-A-TopCV.pdf',
        },
      ],
    });

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual([
      { fileId: 'stored-file-id', label: 'Nguyen-Van-A-TopCV.pdf' },
    ]);

    const uploaded = mockUploadFile.mock.calls[0][0].file as Buffer;

    expect(uploaded.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(uploaded.equals(PDF_BODY)).toBe(true);
  });

  it('leaves a clean PDF byte-for-byte untouched', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockPdfResponse(PDF_BODY),
      ) as unknown as typeof globalThis.fetch;

    await service.archiveRemoteFiles({
      workspaceId: 'workspace-1',
      requests: [
        {
          url: 'https://intake.example.com/cv/abc',
          objectNameSingular: 'candidate',
          fieldName: 'cvfile',
          filename: 'Nguyen-Van-A-TopCV.pdf',
        },
      ],
    });

    const uploaded = mockUploadFile.mock.calls[0][0].file as Buffer;

    expect(uploaded.equals(PDF_BODY)).toBe(true);
  });

  it('does not strip anything when trimming would change the detected type', async () => {
    // 'a.pdf' full of 0x61 is undetectable either way, so the bytes must be
    // preserved as-is rather than risk altering an unknown format.
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockOkResponse(10),
      ) as unknown as typeof globalThis.fetch;

    await service.archiveRemoteFiles({
      workspaceId: 'workspace-1',
      requests: [
        {
          url: 'https://intake.example.com/cv/abc',
          objectNameSingular: 'candidate',
          fieldName: 'cvfile',
        },
      ],
    });

    const uploaded = mockUploadFile.mock.calls[0][0].file as Buffer;

    expect(uploaded.equals(Buffer.alloc(10, 0x61))).toBe(true);
  });

  it('refuses a file that declares a size above the limit', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockOkResponse(26 * 1024 * 1024),
      ) as unknown as typeof globalThis.fetch;

    await expect(
      service.archiveRemoteFiles({
        workspaceId: 'workspace-1',
        requests: [
          {
            url: 'https://intake.example.com/cv/huge',
            objectNameSingular: 'candidate',
            fieldName: 'cvfile',
          },
        ],
      }),
    ).resolves.toEqual({
      items: [],
      errors: ['Declared size 27262976 exceeds the 26214400 bytes limit'],
      attempted: 1,
    });
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('skips the upload when the target field is not a FILES field', async () => {
    mockFindOneWithinWorkspace.mockResolvedValue({
      ...FILES_FIELD_METADATA,
      type: FieldMetadataType.TEXT,
    });

    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockOkResponse(10),
      ) as unknown as typeof globalThis.fetch;

    await expect(
      service.archiveRemoteFiles({
        workspaceId: 'workspace-1',
        requests: [
          {
            url: 'https://intake.example.com/cv/abc',
            objectNameSingular: 'candidate',
            fieldName: 'cvfile',
          },
        ],
      }),
    ).resolves.toEqual({
      items: [],
      errors: ['Field "candidate.cvfile" is not a FILES field (found: TEXT)'],
      attempted: 1,
    });
    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});
