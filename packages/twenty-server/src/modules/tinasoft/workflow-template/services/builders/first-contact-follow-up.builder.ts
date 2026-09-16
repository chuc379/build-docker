import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
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
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class FirstContactFollowUpWorkflowTemplateBuilder implements IWorkflowTemplateBuilder {
  readonly id = 'first-contact-follow-up' as const;

  getDTO(workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Theo dõi sau liên hệ đầu tiên',
      description:
        'Chờ 2 ngày sau khi cơ hội đạt giai đoạn Đánh giá (Screening) và tạo công việc nếu cơ hội chưa thay đổi.',
      shortDescription:
        'Nhắc nhở nhân viên kinh doanh theo dõi sau cuộc liên hệ đầu tiên.',
      purpose:
        'Giúp các thành viên trong đội nhớ gọi lại hoặc chia sẻ các bước tiếp theo sau cuộc trò chuyện đầu tiên.',
      category: 'Hành trình khách hàng',
      icon: 'IconPhoneCall',
      requiredSettings: [],
    };
  }

  build({
    settings,
    workspaceUrl,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const delayStepId = uuidv4();
    const findOpportunityStepId = uuidv4();
    const checkOpportunityExistsStepId = uuidv4();
    const checkUnchangedStepId = uuidv4();
    const createTaskStepId = uuidv4();
    const opportunityUrl = buildRecordUrl({
      workspaceUrl,
      objectName: 'opportunity',
      recordIdVariable: `{{${findOpportunityStepId}.first.id}}`,
    });

    const recordFilterGroup = buildRecordFilterGroup();
    const triggerFilter = buildFilterInput({
      leftOperand: '{{trigger.properties.after.stage}}',
      operand: ViewFilterOperand.IS,
      value: 'SCREENING',
      type: 'select',
      fieldMetadataId: 'stage',
    });

    return {
      workflowName: 'Theo dõi sau liên hệ đầu tiên',
      trigger: {
        name: 'Giai đoạn liên hệ là Đánh giá (Screening)',
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
          name: 'Chờ 2 ngày',
          type: WorkflowActionType.DELAY,
          valid: true,
          position: { x: 0, y: 180 },
          settings: {
            input: {
              delayType: 'DURATION',
              duration: { days: 2, hours: 0, minutes: 0, seconds: 0 },
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
          nextStepIds: [checkUnchangedStepId],
        },
        {
          id: checkUnchangedStepId,
          name: 'Kiểm tra giai đoạn vẫn là Đánh giá (Screening)',
          type: WorkflowActionType.FILTER,
          valid: true,
          position: { x: 0, y: 720 },
          settings: {
            input: buildFilterInput({
              leftOperand: `{{${findOpportunityStepId}.first.stage}}`,
              operand: ViewFilterOperand.IS,
              value: 'SCREENING',
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
                title: `Theo dõi: "{{${findOpportunityStepId}.first.name}}"`,
                bodyV2: buildTaskBody(
                  `Cơ hội "{{${findOpportunityStepId}.first.name}}" chưa được cập nhật sau 2 ngày kể từ lần liên hệ đầu tiên.\nLiên kết: ` +
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
