import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { PrefillLogicFunctionService } from 'src/engine/workspace-manager/standard-objects-prefill-data/services/prefill-logic-function.service';
import { prefillCandidateCustomObject } from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-candidate-custom-object.util';
import { prefillInterviewCustomObject } from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-interview-custom-object.util';
import { prefillJobCustomObject } from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-job-custom-object.util';
import { type WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { getWorkflowTemplateLogicFunctionDefinitions } from 'src/modules/tinasoft/workflow-template/catalog/workflow-template-logic-functions.constant';
import { WorkflowTemplateFactory } from 'src/modules/tinasoft/workflow-template/services/workflow-template.factory';
import { type CreateWorkflowFromTemplateResult } from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';
import { validateWorkflowTemplateSettings } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-settings.util';
import {
  JOB_DESCRIPTION_AGENT_UNIVERSAL_IDENTIFIER,
  getJobDescriptionAgentId,
} from 'src/modules/tinasoft/workflow-template/utils/workflow-template-agent.util';
import {
  WorkflowVersionStatus,
  type WorkflowVersionWorkspaceEntity,
} from 'src/modules/workflow/common/standard-objects/workflow-version.workspace-entity';
import {
  WorkflowStatus,
  type WorkflowWorkspaceEntity,
} from 'src/modules/workflow/common/standard-objects/workflow.workspace-entity';
import { WorkflowSchemaWorkspaceService } from 'src/modules/workflow/workflow-builder/workflow-schema/workflow-schema.workspace-service';
import { isWorkflowFindRecordsAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/guards/is-workflow-find-records-action.guard';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import {
  type WorkflowTrigger,
  WorkflowTriggerType,
} from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';
import { type AppLocale, SOURCE_LOCALE } from 'twenty-shared/translations';
import { isDefined } from 'twenty-shared/utils';

type WorkflowTemplateRecordFilter = {
  fieldMetadataId: string;
  [key: string]: unknown;
};

type WorkflowTemplateStepFilter = {
  fieldMetadataId?: string;
  [key: string]: unknown;
};

@Injectable()
export class WorkflowTemplateWorkspaceService {
  constructor(
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly recordPositionService: RecordPositionService,
    private readonly i18nService: I18nService,
    private readonly prefillLogicFunctionService: PrefillLogicFunctionService,
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly fieldMetadataService: FieldMetadataService,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly workflowSchemaWorkspaceService: WorkflowSchemaWorkspaceService,
    private readonly workflowTemplateFactory: WorkflowTemplateFactory,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  getWorkflowTemplates({
    workspaceDisplayName,
    locale,
  }: {
    workspaceDisplayName: string;
    locale?: AppLocale;
  }): WorkflowTemplateDTO[] {
    const i18n = this.i18nService.getI18nInstance(locale ?? SOURCE_LOCALE);

    return this.workflowTemplateFactory.getAllDTOs({
      workspaceDisplayName,
      i18n,
    });
  }

  async createWorkflowFromTemplate({
    workspaceId,
    templateId,
    settings,
    locale,
  }: {
    workspaceId: string;
    templateId: string;
    settings: Record<string, unknown>;
    locale?: AppLocale;
  }): Promise<CreateWorkflowFromTemplateResult> {
    const builder = this.workflowTemplateFactory.getBuilder(templateId);
    const i18n = this.i18nService.getI18nInstance(locale ?? SOURCE_LOCALE);
    const templateDTO = builder.getDTO('', i18n);
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!isDefined(workspace)) {
      throw new Error(`Workspace "${workspaceId}" not found`);
    }

    const { customUrl, subdomainUrl } =
      this.workspaceDomainsService.getWorkspaceUrls(workspace);
    const workspaceUrl = (customUrl ?? subdomainUrl).replace(/\/$/, '');

    const validatedSettings = validateWorkflowTemplateSettings({
      requiredSettings: templateDTO.requiredSettings,
      settings,
    });

    await this.prefillLogicFunctionService.ensureSeeded({
      workspaceId,
      definitions: getWorkflowTemplateLogicFunctionDefinitions(workspaceId),
    });

    await this.ensureWorkflowTemplateDataModelsSeeded({
      workspaceId,
      templateId,
    });

    if (templateId === 'hr-generate-job-description') {
      await this.ensureJobDescriptionAgentSeeded(workspaceId);
    }

    const workflowTemplateDefinition = builder.build({
      settings: validatedSettings,
      workspaceId,
      workspaceUrl,
    });

    const trigger = await this.resolveDatabaseTriggerFilterFieldMetadataIds({
      workspaceId,
      trigger: workflowTemplateDefinition.trigger,
    });
    const steps = await this.resolveFindRecordsFieldMetadataIds({
      workspaceId,
      steps: workflowTemplateDefinition.steps,
    });
    const authContext = buildSystemAuthContext(workspaceId);

    return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
      const workflowRepository = await this.workspaceOrmManager.getRepository(
        'workflow',
        { shouldBypassPermissionChecks: true },
      );

      const workflowVersionRepository =
        await this.workspaceOrmManager.getRepository<WorkflowVersionWorkspaceEntity>(
          'workflowVersion',
          { shouldBypassPermissionChecks: true },
        );

      const workflowPosition =
        await this.recordPositionService.buildRecordPosition({
          value: 'first',
          objectMetadata: {
            isCustom: false,
            nameSingular: 'workflow',
          },
          workspaceId,
        });

      const insertWorkflowResult = await workflowRepository.insert({
        name: workflowTemplateDefinition.workflowName,
        statuses: [WorkflowStatus.DRAFT],
        position: workflowPosition,
      });

      const workflowId = (
        insertWorkflowResult.generatedMaps[0] as WorkflowWorkspaceEntity
      ).id;

      const workflowVersionPosition =
        await this.recordPositionService.buildRecordPosition({
          value: 'first',
          objectMetadata: {
            isCustom: false,
            nameSingular: 'workflowVersion',
          },
          workspaceId,
        });

      const insertWorkflowVersionResult =
        await workflowVersionRepository.insert({
          workflowId,
          name: 'v1',
          status: WorkflowVersionStatus.DRAFT,
          trigger,
          steps,
          position: workflowVersionPosition,
        });

      const workflowVersion = insertWorkflowVersionResult
        .generatedMaps[0] as WorkflowVersionWorkspaceEntity;

      const enrichedSteps = await Promise.all(
        steps.map((step) =>
          this.workflowSchemaWorkspaceService.enrichOutputSchema({
            step,
            workspaceId,
            workflowVersionId: workflowVersion.id,
          }),
        ),
      );

      await workflowVersionRepository.update(workflowVersion.id, {
        steps: enrichedSteps,
      });

      return {
        ...workflowVersion,
        name: workflowVersion.name ?? '',
        workflowId,
        trigger,
        steps: enrichedSteps,
      };
    }, authContext);
  }

  private async ensureWorkflowTemplateDataModelsSeeded({
    workspaceId,
    templateId,
  }: {
    workspaceId: string;
    templateId: string;
  }): Promise<void> {
    if (templateId === 'hr-generate-job-description') {
      await prefillJobCustomObject({
        workspaceId,
        objectMetadataService: this.objectMetadataService,
        fieldMetadataService: this.fieldMetadataService,
      });
    }

    if (templateId === 'hr-cv-intake-matching') {
      await prefillCandidateCustomObject({
        workspaceId,
        objectMetadataService: this.objectMetadataService,
        fieldMetadataService: this.fieldMetadataService,
      });
    }

    if (templateId === 'hr-schedule-interview') {
      await prefillInterviewCustomObject({
        workspaceId,
        objectMetadataService: this.objectMetadataService,
        fieldMetadataService: this.fieldMetadataService,
      });
    }

    if (templateId === 'hr-send-interview-email') {
      await prefillInterviewCustomObject({
        workspaceId,
        objectMetadataService: this.objectMetadataService,
        fieldMetadataService: this.fieldMetadataService,
      });
    }
  }

  private async ensureJobDescriptionAgentSeeded(workspaceId: string) {
    const [workspace] = await this.workspaceRepository.manager.query(
      `SELECT "workspaceCustomApplicationId" FROM core."workspace" WHERE id = $1`,
      [workspaceId],
    );
    const applicationId = workspace?.workspaceCustomApplicationId;

    if (!applicationId) {
      return;
    }

    const agentId = getJobDescriptionAgentId(workspaceId);

    await this.workspaceRepository.manager
      .createQueryBuilder()
      .insert()
      .into('core.agent', [
        'id',
        'name',
        'label',
        'icon',
        'description',
        'prompt',
        'modelId',
        'responseFormat',
        'isCustom',
        'workspaceId',
        'applicationId',
        'universalIdentifier',
        'modelConfiguration',
        'evaluationInputs',
      ])
      .orIgnore()
      .values([
        {
          id: agentId,
          name: 'generateJobDescriptionAgent',
          label: 'Job Description Generator',
          icon: 'IconBriefcase',
          description:
            'Generates comprehensive job descriptions based on a user-provided prompt',
          prompt: `You are an expert HR specialist. Based on the user's input, generate a job title and a comprehensive job description.

The jobDescription should include:
1. Position Summary - Brief overview of the role
2. Primary Responsibilities - Key duties and deliverables
3. Required Qualifications - Essential skills and experience
4. Nice-to-Have Skills - Preferred qualifications
5. What We Offer - Benefits and compensation

Make the description engaging, clear, and professional.`,
          modelId: 'default-smart-model',
          responseFormat: {
            type: 'json',
            schema: {
              type: 'object',
              properties: {
                jobTitle: {
                  type: 'string',
                  description:
                    'The extracted or inferred job title, e.g. Software Engineer',
                },
                jobDescription: {
                  type: 'string',
                  description: 'The full professional job description',
                },
              },
              required: ['jobTitle', 'jobDescription'],
              additionalProperties: false,
            },
          },
          isCustom: false,
          workspaceId,
          applicationId,
          universalIdentifier: JOB_DESCRIPTION_AGENT_UNIVERSAL_IDENTIFIER,
          modelConfiguration: {},
          evaluationInputs: [],
        },
      ])
      .execute();
  }

  private async resolveFindRecordsFieldMetadataIds({
    workspaceId,
    steps,
  }: {
    workspaceId: string;
    steps: WorkflowAction[];
  }): Promise<WorkflowAction[]> {
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );
    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );
    const fields = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter(isDefined);

    return steps.map((step) => {
      if (!isWorkflowFindRecordsAction(step)) {
        return step;
      }

      const recordFilters = step.settings.input.filter?.recordFilters as
        | WorkflowTemplateRecordFilter[]
        | undefined;

      if (!isDefined(recordFilters)) {
        return step;
      }

      const objectMetadataId = idByNameSingular[step.settings.input.objectName];

      if (!isDefined(objectMetadataId)) {
        throw new Error(
          `Object metadata not found for ${step.settings.input.objectName}`,
        );
      }

      const resolvedRecordFilters = recordFilters.map((recordFilter) => {
        const fieldMetadata = fields.find(
          (field) =>
            field.objectMetadataId === objectMetadataId &&
            field.name === recordFilter.fieldMetadataId,
        );

        if (!isDefined(fieldMetadata)) {
          throw new Error(
            `Field metadata not found for ${step.settings.input.objectName}.${recordFilter.fieldMetadataId}`,
          );
        }

        return { ...recordFilter, fieldMetadataId: fieldMetadata.id };
      });

      return {
        ...step,
        settings: {
          ...step.settings,
          input: {
            ...step.settings.input,
            filter: {
              ...step.settings.input.filter,
              recordFilters: resolvedRecordFilters,
            },
          },
        },
      };
    });
  }

  private async resolveDatabaseTriggerFilterFieldMetadataIds({
    workspaceId,
    trigger,
  }: {
    workspaceId: string;
    trigger: WorkflowTrigger;
  }): Promise<WorkflowTrigger> {
    if (trigger.type !== WorkflowTriggerType.DATABASE_EVENT) {
      return trigger;
    }

    const triggerSettings = trigger.settings as typeof trigger.settings & {
      filter?: { stepFilters?: WorkflowTemplateStepFilter[] };
    };
    const stepFilters = triggerSettings.filter?.stepFilters;

    if (!isDefined(stepFilters)) {
      return trigger;
    }

    const [objectName] = trigger.settings.eventName.split('.');
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );
    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );
    const objectMetadataId = idByNameSingular[objectName];

    if (!isDefined(objectMetadataId)) {
      throw new Error(`Object metadata not found for ${objectName}`);
    }

    const fields = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter(isDefined);
    const resolvedStepFilters = stepFilters.map((stepFilter) => {
      if (!isDefined(stepFilter.fieldMetadataId)) {
        return stepFilter;
      }

      const fieldMetadata = fields.find(
        (field) =>
          field.objectMetadataId === objectMetadataId &&
          field.name === stepFilter.fieldMetadataId,
      );

      if (!isDefined(fieldMetadata)) {
        throw new Error(
          `Field metadata not found for ${objectName}.${stepFilter.fieldMetadataId}`,
        );
      }

      return { ...stepFilter, fieldMetadataId: fieldMetadata.id };
    });

    return {
      ...trigger,
      settings: {
        ...trigger.settings,
        filter: {
          ...triggerSettings.filter,
          stepFilters: resolvedStepFilters,
        },
      },
    } as WorkflowTrigger;
  }
}
