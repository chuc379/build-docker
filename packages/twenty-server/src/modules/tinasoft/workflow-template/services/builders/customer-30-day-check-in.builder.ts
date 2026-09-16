import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { v4 as uuidv4 } from 'uuid';

import { ViewFilterOperand } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  type WorkflowTemplateBuildContext,
  type WorkflowTemplateDefinition,
} from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';
import {
  buildFilterInput,
  buildRecordFilterGroup,
  buildRecordUrl,
  buildTaskBody,
  ERROR_HANDLING_OPTIONS,
} from 'src/modules/tinasoft/workflow-template/utils/workflow-template-builder-helpers.util';
import { getNumberWorkflowTemplateSetting } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-settings.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class Customer30DayCheckInWorkflowTemplateBuilder implements IWorkflowTemplateBuilder {
  readonly id = 'customer-30-day-check-in' as const;

  getDTO(workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Chăm sóc khách hàng sau 30 ngày',
      description:
        'Tạo công việc theo dõi sau khi một cơ hội duy trì là khách hàng trong số ngày được cấu hình.',
      shortDescription:
        'Nhắc nhở đội ngũ chăm sóc khách hàng sau 30 ngày sử dụng hoặc mua hàng.',
      purpose:
        'Giúp đội ngũ theo dõi sau khi bán hàng để biết khách hàng có hài lòng hay cần hỗ trợ thêm không.',
      category: 'Chăm sóc khách hàng',
      icon: 'IconCalendarTime',
      requiredSettings: [
        {
          key: 'checkInDays',
          type: 'number',
          label:
            i18n?._(msg`Days before customer check-in`) ??
            'Số ngày trước khi chăm sóc khách hàng',
          defaultValue: '30',
        },
      ],
    };
  }

  build({
    settings,
    workspaceUrl,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const delayStepId = uuidv4();
    const findOpportunityStepId = uuidv4();
    const checkOpportunityExistsStepId = uuidv4();
    const checkCustomerStageStepId = uuidv4();
    const createTaskStepId = uuidv4();
    const opportunityUrl = buildRecordUrl({
      workspaceUrl,
      objectName: 'opportunity',
      recordIdVariable: `{{${findOpportunityStepId}.first.id}}`,
    });
    const checkInDays = getNumberWorkflowTemplateSetting({
      settings,
      key: 'checkInDays',
    });

    const triggerFilter = buildFilterInput({
      leftOperand: '{{trigger.properties.after.stage}}',
      operand: ViewFilterOperand.IS,
      value: 'CUSTOMER',
      type: 'select',
      fieldMetadataId: 'stage',
    });
    const recordFilterGroup = buildRecordFilterGroup();

    return {
      workflowName: 'Chăm sóc khách hàng sau 30 ngày',
      trigger: {
        name: 'Giai đoạn cơ hội là Khách hàng (Customer)',
        type: WorkflowTriggerType.DATABASE_EVENT,
        settings: {
          eventName: 'opportunity.updated',
          fields: ['stage'],
          outputSchema: {},
          filter: triggerFilter,
        },
        nextStepIds: [delayStepId],
        position: { x: 0, y: 0 },
      },
      steps: [
        {
          id: delayStepId,
          name: `Chờ ${checkInDays} ngày`,
          type: WorkflowActionType.DELAY,
          valid: true,
          position: { x: 0, y: 180 },
          settings: {
            input: {
              delayType: 'DURATION',
              duration: {
                days: checkInDays,
                hours: 0,
                minutes: 0,
                seconds: 0,
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [findOpportunityStepId],
        },
        {
          id: findOpportunityStepId,
          name: 'Tải lại cơ hội',
          type: WorkflowActionType.FIND_RECORDS,
          valid: true,
          position: { x: 0, y: 360 },
          settings: {
            input: {
              objectName: 'opportunity',
              limit: 1,
              filter: {
                recordFilterGroups: [recordFilterGroup],
                recordFilters: [
                  {
                    id: uuidv4(),
                    type: 'UUID',
                    value: '{{trigger.properties.after.id}}',
                    operand: ViewFilterOperand.IS,
                    fieldMetadataId: 'id',
                    recordFilterGroupId: recordFilterGroup.id,
                  },
                ],
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [checkOpportunityExistsStepId],
        },
        {
          id: checkOpportunityExistsStepId,
          name: 'Kiểm tra cơ hội vẫn tồn tại',
          type: WorkflowActionType.FILTER,
          valid: true,
          position: { x: 0, y: 540 },
          settings: {
            input: buildFilterInput({
              leftOperand: `{{${findOpportunityStepId}.first.id}}`,
              operand: ViewFilterOperand.IS_NOT_EMPTY,
              value: '',
              type: 'uuid',
            }),
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [checkCustomerStageStepId],
        },
        {
          id: checkCustomerStageStepId,
          name: 'Kiểm tra cơ hội vẫn ở giai đoạn Khách hàng',
          type: WorkflowActionType.FILTER,
          valid: true,
          position: { x: 0, y: 720 },
          settings: {
            input: buildFilterInput({
              leftOperand: `{{${findOpportunityStepId}.first.stage}}`,
              operand: ViewFilterOperand.IS,
              value: 'CUSTOMER',
              type: 'select',
              fieldMetadataId: 'stage',
            }),
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [createTaskStepId],
        },
        {
          id: createTaskStepId,
          name: 'Tạo công việc theo dõi cho người phụ trách cơ hội',
          type: WorkflowActionType.CREATE_RECORD,
          valid: true,
          position: { x: 0, y: 900 },
          settings: {
            input: {
              objectName: 'task',
              objectRecord: {
                title: `Chăm sóc khách hàng: "{{${findOpportunityStepId}.first.name}}"`,
                bodyV2: buildTaskBody(
                  `Đã trôi qua ${checkInDays} ngày kể từ khi cơ hội "{{${findOpportunityStepId}.first.name}}" trở thành khách hàng. Hãy liên hệ chăm sóc khách hàng.\nLiên kết: ` +
                    opportunityUrl,
                ),
                assignee: {
                  id: `{{${findOpportunityStepId}.first.ownerId}}`,
                },
                status: 'TODO',
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [],
        },
      ] satisfies WorkflowAction[] as WorkflowAction[],
    };
  }
}
