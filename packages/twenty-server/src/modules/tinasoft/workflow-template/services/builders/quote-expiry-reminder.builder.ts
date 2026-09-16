import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { v4 as uuidv4 } from 'uuid';

import { OrderByDirection, ViewFilterOperand } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { getWorkflowTemplateLogicFunctionIds } from 'src/modules/tinasoft/workflow-template/catalog/workflow-template-logic-functions.constant';
import { IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  type WorkflowTemplateBuildContext,
  type WorkflowTemplateDefinition,
} from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';
import {
  buildRecordFilterGroup,
  buildRecordUrl,
  buildTaskBody,
  ERROR_HANDLING_OPTIONS,
} from 'src/modules/tinasoft/workflow-template/utils/workflow-template-builder-helpers.util';
import { getNumberWorkflowTemplateSetting } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-settings.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class QuoteExpiryReminderWorkflowTemplateBuilder implements IWorkflowTemplateBuilder {
  readonly id = 'quote-expiry-reminder' as const;

  getDTO(workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Nhắc nhở báo giá sắp hết hạn',
      description:
        'Tìm các cơ hội mở sắp hết hạn trong số ngày được cấu hình và gửi email cho người phụ trách.',
      shortDescription:
        'Nhắc nhở khách hàng và nhân viên khi báo giá sắp hết hạn.',
      purpose:
        'Giúp đội ngũ theo dõi trước khi báo giá hết hạn và giảm bớt cơ hội bán hàng bị bỏ lỡ.',
      category: 'Hành trình khách hàng',
      icon: 'IconClockAlert',
      requiredSettings: [
        {
          key: 'daysBeforeExpiry',
          type: 'number',
          label:
            i18n?._(msg`Days before quote expiry`) ??
            'Số ngày trước khi báo giá hết hạn',
          defaultValue: '5',
        },
      ],
    };
  }

  build({
    settings,
    workspaceId,
    workspaceUrl,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const findOpportunitiesStepId = uuidv4();
    const filterExpiryStepId = uuidv4();
    const iteratorStepId = uuidv4();
    const createTaskStepId = uuidv4();
    const opportunityUrl = buildRecordUrl({
      workspaceUrl,
      objectName: 'opportunity',
      recordIdVariable: `{{${iteratorStepId}.currentItem.id}}`,
    });
    const daysBeforeExpiry = getNumberWorkflowTemplateSetting({
      settings,
      key: 'daysBeforeExpiry',
    });

    const { filterExpiringOpportunities } =
      getWorkflowTemplateLogicFunctionIds(workspaceId);

    const findOpportunitiesFilterGroup = buildRecordFilterGroup();

    return {
      workflowName: 'Nhắc nhở báo giá sắp hết hạn',
      trigger: {
        name: 'Mỗi ngày lúc 09:00 UTC',
        type: WorkflowTriggerType.CRON,
        settings: {
          type: 'DAYS',
          schedule: { day: 1, hour: 9, minute: 0 },
          outputSchema: {},
        },
        nextStepIds: [findOpportunitiesStepId],
        position: { x: 0, y: 0 },
      },
      steps: [
        {
          id: findOpportunitiesStepId,
          name: 'Tìm các cơ hội đang mở',
          type: WorkflowActionType.FIND_RECORDS,
          valid: true,
          position: { x: 0, y: 180 },
          settings: {
            input: {
              objectName: 'opportunity',
              limit: 200,
              pagination: {
                fetchAll: true,
                maxRecords: 5000,
                pageSize: 200,
              },
              filter: {
                recordFilterGroups: [findOpportunitiesFilterGroup],
                recordFilters: [
                  {
                    id: uuidv4(),
                    type: 'DATE',
                    value: '',
                    operand: ViewFilterOperand.IS_IN_FUTURE,
                    fieldMetadataId: 'closeDate',
                    recordFilterGroupId: findOpportunitiesFilterGroup.id,
                  },
                  {
                    id: uuidv4(),
                    type: 'SELECT',
                    value: '["CUSTOMER"]',
                    operand: ViewFilterOperand.IS_NOT,
                    fieldMetadataId: 'stage',
                    recordFilterGroupId: findOpportunitiesFilterGroup.id,
                  },
                ],
              },
              orderBy: {
                gqlOperationOrderBy: [
                  { closeDate: OrderByDirection.AscNullsLast },
                ],
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [filterExpiryStepId],
        },
        {
          id: filterExpiryStepId,
          name: 'Lọc các báo giá sẽ hết hạn trong N ngày',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 360 },
          settings: {
            input: {
              logicFunctionId: filterExpiringOpportunities,
              logicFunctionInput: {
                opportunities: `{{${findOpportunitiesStepId}.all}}`,
                daysBeforeExpiry,
              },
            },
            outputSchema: {
              opportunities: {
                isLeaf: true,
                type: 'array',
                label: 'Cơ hội hết hạn vào ngày mục tiêu',
                value: [
                  {
                    id: '20202020-1111-4111-8111-111111111111',
                    name: 'ACME Corp',
                    closeDate: '2026-08-18T00:00:00.000Z',
                    ownerId: '20202020-1111-4111-8111-111111111111',
                  },
                ],
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [iteratorStepId],
        },
        {
          id: iteratorStepId,
          name: 'Lặp qua từng cơ hội sắp hết hạn',
          type: WorkflowActionType.ITERATOR,
          valid: true,
          position: { x: 0, y: 540 },
          settings: {
            input: {
              items: `{{${filterExpiryStepId}.opportunities}}`,
              initialLoopStepIds: [createTaskStepId],
              shouldContinueOnIterationFailure: true,
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [],
        },
        {
          id: createTaskStepId,
          name: 'Tạo công việc theo dõi cho người phụ trách cơ hội',
          type: WorkflowActionType.CREATE_RECORD,
          valid: true,
          position: { x: 0, y: 720 },
          settings: {
            input: {
              objectName: 'task',
              objectRecord: {
                title: `Theo dõi báo giá sắp hết hạn: "{{${iteratorStepId}.currentItem.name}}"`,
                bodyV2: buildTaskBody(
                  `Báo giá cho cơ hội "{{${iteratorStepId}.currentItem.name}}" sẽ hết hạn sau ${daysBeforeExpiry} ngày.\nLiên kết: ` +
                    opportunityUrl,
                ),
                assignee: {
                  id: `{{${iteratorStepId}.currentItem.ownerId}}`,
                },
                status: 'TODO',
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [iteratorStepId],
        },
      ] satisfies WorkflowAction[] as WorkflowAction[],
    };
  }
}
