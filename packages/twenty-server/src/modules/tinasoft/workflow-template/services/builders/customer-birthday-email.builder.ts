import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { v4 as uuidv4 } from 'uuid';

import { StepLogicalOperator, ViewFilterOperand } from 'twenty-shared/types';
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
  buildRecordFilterGroup,
  ERROR_HANDLING_OPTIONS,
} from 'src/modules/tinasoft/workflow-template/utils/workflow-template-builder-helpers.util';
import { getStringWorkflowTemplateSetting } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-settings.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class CustomerBirthdayEmailWorkflowTemplateBuilder implements IWorkflowTemplateBuilder {
  readonly id = 'customer-birthday-email' as const;

  getDTO(workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Email chúc mừng sinh nhật khách hàng',
      description:
        'Tìm kiếm các cá nhân thuộc nhóm VIP và VVIP có sinh nhật hôm nay, sau đó gửi lời chúc mừng được cá nhân hóa.',
      shortDescription:
        'Tự động gửi email chúc mừng sinh nhật cho khách hàng VIP và VVIP.',
      purpose:
        'Giúp doanh nghiệp xây dựng mối quan hệ gắn kết hơn với các khách hàng quan trọng thông qua lời chúc sinh nhật cá nhân hóa.',
      category: 'Chăm sóc khách hàng',
      icon: 'IconCake',
      requiredSettings: [
        {
          key: 'workspaceName',
          type: 'text',
          label: i18n?._(msg`Workspace name`) ?? 'Tên không gian làm việc',
          defaultValue: workspaceDisplayName,
        },
      ],
    };
  }

  build({
    settings,
    workspaceId,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const findPeopleStepId = uuidv4();
    const findBirthdaysStepId = uuidv4();
    const iteratorStepId = uuidv4();
    const sendEmailStepId = uuidv4();
    const workspaceName = getStringWorkflowTemplateSetting({
      settings,
      key: 'workspaceName',
    });
    const { filterTodaysBirthdays } =
      getWorkflowTemplateLogicFunctionIds(workspaceId);
    const birthdayFilterGroup = buildRecordFilterGroup();
    const customerTypeFilterGroup = {
      id: uuidv4(),
      logicalOperator: StepLogicalOperator.OR,
      parentRecordFilterGroupId: birthdayFilterGroup.id,
    };

    return {
      workflowName: 'Email chúc mừng sinh nhật khách hàng',
      trigger: {
        name: 'Mỗi ngày lúc 01:00 UTC',
        type: WorkflowTriggerType.CRON,
        settings: {
          type: 'DAYS',
          schedule: { day: 1, hour: 1, minute: 0 },
          outputSchema: {},
        },
        nextStepIds: [findPeopleStepId],
        position: { x: 0, y: 0 },
      },
      steps: [
        {
          id: findPeopleStepId,
          name: 'Tìm các liên hệ có sinh nhật',
          type: WorkflowActionType.FIND_RECORDS,
          valid: true,
          position: { x: 0, y: 180 },
          settings: {
            input: {
              objectName: 'person',
              limit: 200,
              pagination: {
                fetchAll: true,
                maxRecords: 5000,
                pageSize: 200,
              },
              filter: {
                recordFilterGroups: [
                  birthdayFilterGroup,
                  customerTypeFilterGroup,
                ],
                recordFilters: [
                  {
                    id: uuidv4(),
                    type: 'TEXT',
                    value: '',
                    operand: ViewFilterOperand.IS_NOT_EMPTY,
                    fieldMetadataId: 'emails',
                    recordFilterGroupId: birthdayFilterGroup.id,
                  },
                  {
                    id: uuidv4(),
                    type: 'DATE',
                    value: '',
                    operand: ViewFilterOperand.IS_NOT_EMPTY,
                    fieldMetadataId: 'birthday',
                    recordFilterGroupId: birthdayFilterGroup.id,
                  },
                  {
                    id: uuidv4(),
                    type: 'SELECT',
                    value: '["VIP"]',
                    operand: ViewFilterOperand.IS,
                    fieldMetadataId: 'customerType',
                    recordFilterGroupId: customerTypeFilterGroup.id,
                  },
                  {
                    id: uuidv4(),
                    type: 'SELECT',
                    value: '["VVIP"]',
                    operand: ViewFilterOperand.IS,
                    fieldMetadataId: 'customerType',
                    recordFilterGroupId: customerTypeFilterGroup.id,
                  },
                ],
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [findBirthdaysStepId],
        },
        {
          id: findBirthdaysStepId,
          name: 'Tìm danh sách sinh nhật hôm nay',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 360 },
          settings: {
            input: {
              logicFunctionId: filterTodaysBirthdays,
              logicFunctionInput: { people: `{{${findPeopleStepId}.all}}` },
            },
            outputSchema: {
              people: {
                isLeaf: true,
                type: 'array',
                label: 'Danh sách sinh nhật hôm nay',
                value: [
                  {
                    name: { firstName: 'Nguyen', lastName: 'Van A' },
                    emails: { primaryEmail: 'van.a@example.com' },
                    customerType: 'VIP',
                    birthday: '1990-01-15',
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
          name: 'Lặp qua từng liên hệ có sinh nhật',
          type: WorkflowActionType.ITERATOR,
          valid: true,
          position: { x: 0, y: 540 },
          settings: {
            input: {
              items: `{{${findBirthdaysStepId}.people}}`,
              initialLoopStepIds: [sendEmailStepId],
              shouldContinueOnIterationFailure: true,
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [],
        },
        {
          id: sendEmailStepId,
          name: 'Gửi email chúc mừng sinh nhật',
          type: WorkflowActionType.SEND_EMAIL,
          valid: true,
          position: { x: 0, y: 720 },
          settings: {
            input: {
              connectedAccountId: '',
              recipients: {
                to: `{{${iteratorStepId}.currentItem.emails.primaryEmail}}`,
                cc: '',
                bcc: '',
              },
              subject: `Chúc mừng sinh nhật {{${iteratorStepId}.currentItem.name.firstName}} {{${iteratorStepId}.currentItem.name.lastName}} từ ${workspaceName}`,
              body: buildEmailBody({
                badgeText: 'Chúc mừng sinh nhật',
                badgeColor: '#db2777',
                badgeBgColor: '#fdf2f8',
                title: `Chúc mừng sinh nhật {{${iteratorStepId}.currentItem.name.firstName}} {{${iteratorStepId}.currentItem.name.lastName}}! 🎉`,
                paragraphs: [
                  `${workspaceName} xin trân trọng gửi đến bạn lời chúc mừng sinh nhật nồng nhiệt và tốt đẹp nhất!`,
                  'Chúc bạn đón một tuổi mới thật nhiều sức khỏe, hạnh phúc, niềm vui và thành công rực rỡ trong công việc.',
                  'Cảm ơn bạn đã luôn tin tưởng và đồng hành cùng chúng tôi.',
                ],
                footerText: `Thư chúc mừng từ đội ngũ ${workspaceName}`,
              }),
              files: [],
              inReplyTo: '',
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
