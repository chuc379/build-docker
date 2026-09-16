import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { v4 as uuidv4 } from 'uuid';

import { FieldMetadataType, ViewFilterOperand } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { getWorkflowTemplateLogicFunctionIds } from 'src/modules/tinasoft/workflow-template/catalog/workflow-template-logic-functions.constant';
import { IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  type WorkflowTemplateBuildContext,
  type WorkflowTemplateDefinition,
} from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';
import {
  buildEmailBody,
  buildFilterInput,
  buildRecordUrl,
  buildTaskBody,
  ERROR_HANDLING_OPTIONS,
} from 'src/modules/tinasoft/workflow-template/utils/workflow-template-builder-helpers.util';
import { getStringWorkflowTemplateSetting } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-settings.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class NewLeadAlertWorkflowTemplateBuilder implements IWorkflowTemplateBuilder {
  readonly id = 'new-lead-alert' as const;

  getDTO(workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Cảnh báo khách hàng tiềm năng mới',
      description:
        'Thông báo cho đội ngũ kinh doanh và tạo công việc liên hệ đầu tiên.',
      shortDescription:
        'Cảnh báo cho nhóm ngay khi nhận được khách hàng tiềm năng mới.',
      purpose:
        'Giúp đội ngũ bán hàng phản hồi nhanh chóng với các leads mới và tránh bỏ sót khách hàng.',
      category: 'Khách hàng & Tiềm năng',
      icon: 'IconUserPlus',
      requiredSettings: [
        {
          key: 'teamEmail',
          type: 'email',
          label: i18n?._(msg`Sales team email`) ?? 'Email đội ngũ kinh doanh',
        },
      ],
    };
  }

  build({
    settings,
    workspaceId,
    workspaceUrl,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const sendEmailStepId = uuidv4();
    const computeDueDateStepId = uuidv4();
    const createTaskStepId = uuidv4();
    const teamEmail = getStringWorkflowTemplateSetting({
      settings,
      key: 'teamEmail',
    });
    const { addOneDay } = getWorkflowTemplateLogicFunctionIds(workspaceId);
    const personUrl = buildRecordUrl({
      workspaceUrl,
      objectName: 'person',
      recordIdVariable: '{{trigger.properties.after.id}}',
    });
    const triggerFilter = buildFilterInput({
      leftOperand: '{{trigger.properties.after.emails.primaryEmail}}',
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
      type: 'email',
    });

    return {
      workflowName: 'Thông báo khách hàng tiềm năng mới',
      trigger: {
        name: 'Khách hàng tiềm năng được cập nhật email',
        type: WorkflowTriggerType.DATABASE_EVENT,
        settings: {
          eventName: 'person.upserted',
          fields: ['emails'],
          outputSchema: {},
          filter: triggerFilter,
        },
        nextStepIds: [sendEmailStepId],
        position: { x: 0, y: 0 },
      },
      steps: [
        {
          id: sendEmailStepId,
          name: 'Thông báo cho quản trị viên và đội ngũ kinh doanh',
          type: WorkflowActionType.SEND_EMAIL,
          valid: true,
          position: { x: 0, y: 180 },
          settings: {
            input: {
              connectedAccountId: '',
              recipients: {
                to: teamEmail,
                cc: '',
                bcc: '',
              },
              subject:
                'Khách hàng tiềm năng mới: {{trigger.properties.after.name.firstName}} {{trigger.properties.after.name.lastName}}',
              body: buildEmailBody({
                badgeText: 'Khách hàng mới',
                badgeColor: '#2563eb',
                badgeBgColor: '#eff6ff',
                title: 'Cảnh báo: Khách hàng tiềm năng mới',
                paragraphs: [
                  'Hệ thống vừa ghi nhận một khách hàng tiềm năng mới cần được đội ngũ Sales chăm sóc.',
                  'Vui lòng chủ động kiểm tra thông tin và thực hiện cuộc gọi/email liên hệ trong ngày làm việc tiếp theo.',
                ],
                details: [
                  {
                    label: 'Họ và tên',
                    value:
                      '{{trigger.properties.after.name.firstName}} {{trigger.properties.after.name.lastName}}',
                  },
                  {
                    label: 'Email chính',
                    value: '{{trigger.properties.after.emails.primaryEmail}}',
                  },
                ],
                linkText: '🚀 Mở hồ sơ khách hàng',
                linkUrl: personUrl,
              }),
              files: [],
              inReplyTo: '',
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [computeDueDateStepId],
        },
        {
          id: computeDueDateStepId,
          name: 'Tính toán hạn chót liên hệ đầu tiên',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 360 },
          settings: {
            input: {
              logicFunctionId: addOneDay,
              logicFunctionInput: {
                createdAt: '{{trigger.properties.after.createdAt}}',
              },
            },
            outputSchema: {
              dueAt: {
                isLeaf: true,
                type: FieldMetadataType.DATE_TIME,
                label: 'Hạn chót liên hệ đầu tiên',
                value: '2026-01-02T00:00:00.000Z',
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [createTaskStepId],
        },
        {
          id: createTaskStepId,
          name: 'Tạo công việc liên hệ đầu tiên',
          type: WorkflowActionType.CREATE_RECORD,
          valid: true,
          position: { x: 0, y: 540 },
          settings: {
            input: {
              objectName: 'task',
              objectRecord: {
                title:
                  'Liên hệ đầu tiên: "{{trigger.properties.after.name.firstName}} {{trigger.properties.after.name.lastName}}"',
                bodyV2: buildTaskBody(
                  'Liên hệ khách hàng tiềm năng mới: "{{trigger.properties.after.name.firstName}} {{trigger.properties.after.name.lastName}}".\nLiên kết: ' +
                    personUrl,
                ),
                dueAt: `{{${computeDueDateStepId}.dueAt}}`,
                assignee: {
                  id: '{{trigger.properties.after.createdBy.workspaceMemberId}}',
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
