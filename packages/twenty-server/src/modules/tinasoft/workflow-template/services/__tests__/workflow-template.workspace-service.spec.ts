import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { PrefillLogicFunctionService } from 'src/engine/workspace-manager/standard-objects-prefill-data/services/prefill-logic-function.service';
import { type IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  WORKFLOW_TEMPLATE_BUILDER,
  WORKFLOW_TEMPLATE_BUILDERS,
} from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template-builder.constants';
import { WorkflowTemplateFactory } from 'src/modules/tinasoft/workflow-template/services/workflow-template.factory';
import { WorkflowTemplateWorkspaceService } from 'src/modules/tinasoft/workflow-template/services/workflow-template.workspace-service';
import { WorkflowSchemaWorkspaceService } from 'src/modules/workflow/workflow-builder/workflow-schema/workflow-schema.workspace-service';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

const mockWorkspaceId = '20202020-1111-4111-8111-111111111111';
const mockWorkflowId = 'workflow-id';
const mockWorkflowVersionId = 'workflow-version-id';

describe('WorkflowTemplateWorkspaceService', () => {
  let service: WorkflowTemplateWorkspaceService;
  let enrichOutputSchema: jest.Mock;
  let workflowVersionRepository: { insert: jest.Mock; update: jest.Mock };
  let workspaceRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    enrichOutputSchema = jest
      .fn()
      .mockImplementation(({ step }: { step: WorkflowAction }) =>
        step.type === WorkflowActionType.ITERATOR
          ? {
              ...step,
              settings: {
                ...step.settings,
                outputSchema: {
                  currentItem: {
                    isLeaf: false,
                    type: 'object',
                    label: 'Current Item',
                    value: {
                      name: {
                        isLeaf: false,
                        type: 'object',
                        label: 'name',
                        value: {
                          firstName: {
                            isLeaf: true,
                            type: 'string',
                            label: 'firstName',
                            value: 'Nguyen',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }
          : step,
      );

    workflowVersionRepository = {
      insert: jest
        .fn()
        .mockResolvedValue({ generatedMaps: [{ id: mockWorkflowVersionId }] }),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const workflowRepository = {
      insert: jest
        .fn()
        .mockResolvedValue({ generatedMaps: [{ id: mockWorkflowId }] }),
    };

    const workspaceOrmManager = {
      getRepository: jest
        .fn()
        .mockImplementation((entityName: string) => {
          if (entityName === 'workflow') {
            return workflowRepository;
          }

          return workflowVersionRepository;
        }),
      executeInWorkspaceContext: jest
        .fn()
        .mockImplementation((fn: () => unknown) => fn()),
    } as unknown as WorkspaceOrmManager;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowTemplateWorkspaceService,
        WorkflowTemplateFactory,
        ...WORKFLOW_TEMPLATE_BUILDERS,
        {
          provide: WORKFLOW_TEMPLATE_BUILDER,
          useFactory: (...builders: IWorkflowTemplateBuilder[]) => builders,
          inject: [...WORKFLOW_TEMPLATE_BUILDERS],
        },
        {
          provide: WorkspaceOrmManager,
          useValue: workspaceOrmManager,
        },
        {
          provide: ObjectMetadataService,
          useValue: {
            findOneWithinWorkspace: jest.fn().mockResolvedValue(null),
            createOneObject: jest.fn().mockResolvedValue({ id: 'object-id' }),
          },
        },
        {
          provide: FieldMetadataService,
          useValue: {
            createManyFields: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RecordPositionService,
          useValue: {
            buildRecordPosition: jest.fn().mockResolvedValue({ position: 0 }),
          },
        },
        {
          provide: I18nService,
          useValue: { getI18nInstance: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: PrefillLogicFunctionService,
          useValue: { ensureSeeded: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: WorkspaceManyOrAllFlatEntityMapsCacheService,
          useValue: {
            getOrRecomputeManyOrAllFlatEntityMaps: jest.fn().mockResolvedValue({
              flatObjectMetadataMaps: {
                byUniversalIdentifier: {
                  'person-standard': {
                    id: 'person-object-id',
                    nameSingular: 'person',
                    namePlural: 'people',
                  },
                },
              },
              flatFieldMetadataMaps: {
                byUniversalIdentifier: {
                  'person-emails-field': {
                    id: 'person-emails-field-id',
                    objectMetadataId: 'person-object-id',
                    name: 'emails',
                  },
                  'birthday-field': {
                    id: 'birthday-field-id',
                    objectMetadataId: 'person-object-id',
                    name: 'birthday',
                  },
                  'customer-type-field': {
                    id: 'customer-type-field-id',
                    objectMetadataId: 'person-object-id',
                    name: 'customerType',
                  },
                },
              },
            }),
          },
        },
        {
          provide: WorkflowSchemaWorkspaceService,
          useValue: { enrichOutputSchema },
        },
        {
          provide: WorkspaceDomainsService,
          useValue: {
            getWorkspaceUrls: jest.fn().mockReturnValue({
              customUrl: undefined,
              subdomainUrl: 'https://acme.tina-crm.test',
            }),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: mockWorkspaceId,
              subdomain: 'acme',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(WorkflowTemplateWorkspaceService);
    workspaceRepository = module.get(
      getRepositoryToken(WorkspaceEntity),
    ) as unknown as { findOne: jest.Mock };
  });

  it('enriches iterator output schemas and persists them when creating a workflow from template', async () => {
    const result = await service.createWorkflowFromTemplate({
      workspaceId: mockWorkspaceId,
      templateId: 'customer-birthday-email',
      settings: {
        workspaceName: 'Acme',
      },
    });

    expect(enrichOutputSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: mockWorkspaceId,
        workflowVersionId: mockWorkflowVersionId,
      }),
    );

    const iteratorEnrichmentCalls = enrichOutputSchema.mock.calls.filter(
      ([args]: [{ step: WorkflowAction }]) =>
        args.step.type === WorkflowActionType.ITERATOR,
    );

    expect(iteratorEnrichmentCalls).toHaveLength(1);

    expect(workflowVersionRepository.update).toHaveBeenCalledWith(
      mockWorkflowVersionId,
      expect.objectContaining({
        steps: expect.arrayContaining([
          expect.objectContaining({
            type: WorkflowActionType.ITERATOR,
            settings: expect.objectContaining({
              outputSchema: expect.objectContaining({
                currentItem: expect.objectContaining({ label: 'Current Item' }),
              }),
            }),
          }),
        ]),
      }),
    );

    const iteratorStep = result.steps?.find(
      (step) => step.type === WorkflowActionType.ITERATOR,
    );
    const iteratorOutputSchema = (iteratorStep?.settings.outputSchema ??
      {}) as Record<string, unknown>;

    expect(iteratorOutputSchema.currentItem).toBeDefined();
  });

  it('returns all workflow template DTOs', () => {
    const templates = service.getWorkflowTemplates({
      workspaceDisplayName: 'Acme',
    });

    expect(templates).toHaveLength(8);
    expect(templates.map(({ id }) => id).sort()).toEqual(
      [
        'new-lead-alert',
        'first-contact-follow-up',
        'quote-expiry-reminder',
        'customer-30-day-check-in',
        're-purchase-reminder',
        'customer-birthday-email',
        'hr-cv-intake-matching',
        'hr-generate-job-description',
      ].sort(),
    );
  });

  it('creates a workflow from a template without iterator steps', async () => {
    const result = await service.createWorkflowFromTemplate({
      workspaceId: mockWorkspaceId,
      templateId: 'new-lead-alert',
      settings: {
        teamEmail: 'sales@acme.com',
      },
    });

    expect(enrichOutputSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: mockWorkspaceId,
        workflowVersionId: mockWorkflowVersionId,
      }),
    );

    const iteratorEnrichmentCalls = enrichOutputSchema.mock.calls.filter(
      ([args]: [{ step: WorkflowAction }]) =>
        args.step.type === WorkflowActionType.ITERATOR,
    );

    expect(iteratorEnrichmentCalls).toHaveLength(0);
    expect(result.steps?.some(({ type }) => type === 'SEND_EMAIL')).toBe(true);
    expect(result.steps?.some(({ type }) => type === 'CREATE_RECORD')).toBe(
      true,
    );
  });

  it('throws when workspace is not found', async () => {
    workspaceRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createWorkflowFromTemplate({
        workspaceId: mockWorkspaceId,
        templateId: 'new-lead-alert',
        settings: {
          teamEmail: 'sales@acme.com',
        },
      }),
    ).rejects.toThrow(`Workspace "${mockWorkspaceId}" not found`);
  });

  it('throws when template ID does not exist', async () => {
    await expect(
      service.createWorkflowFromTemplate({
        workspaceId: mockWorkspaceId,
        templateId: 'unknown-template',
        settings: {},
      }),
    ).rejects.toThrow('Workflow template "unknown-template" not found');
  });
});
