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
export class RepurchaseReminderWorkflowTemplateBuilder implements IWorkflowTemplateBuilder {
  readonly id = 're-purchase-reminder' as const;

  getDTO(workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Nhắc nhở tái mua hàng',
      description:
        'Tạo công việc cho người phụ trách công ty khi cơ hội hoàn thành gần nhất đạt độ tuổi được cấu hình.',
      shortDescription:
        'Nhắc nhở đội ngũ kết nối lại với khách hàng lâu chưa mua hàng.',
      purpose:
        'Giúp đội ngũ kinh doanh và chăm sóc khách hàng phát hiện các khách hàng ngừng hoạt động để gọi lại hoặc giới thiệu sản phẩm phù hợp.',
      category: 'Chăm sóc khách hàng',
      icon: 'IconShoppingCart',
      requiredSettings: [
        {
          key: 'repurchaseDays',
          type: 'number',
          label:
            i18n?._(msg`Days since last purchase`) ??
            'Số ngày kể từ lần mua hàng gần nhất',
          defaultValue: '30',
        },
      ],
    };
  }

  build({
    settings,
    workspaceId,
    workspaceUrl,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const findCompaniesStepId = uuidv4();
    const iteratorStepId = uuidv4();
    const findOpenOpportunitiesStepId = uuidv4();
    const findOpportunitiesStepId = uuidv4();
    const checkReminderStepId = uuidv4();
    const reminderIteratorStepId = uuidv4();
    const createTaskStepId = uuidv4();
    const companyUrl = buildRecordUrl({
      workspaceUrl,
      objectName: 'company',
      recordIdVariable: `{{${reminderIteratorStepId}.currentItem.companyId}}`,
    });
    const repurchaseDays = getNumberWorkflowTemplateSetting({
      settings,
      key: 'repurchaseDays',
    });

    const { checkRepurchaseReminder } =
      getWorkflowTemplateLogicFunctionIds(workspaceId);

    const opportunitiesFilterGroup = buildRecordFilterGroup();
    const openOpportunitiesFilterGroup = buildRecordFilterGroup();

    return {
      workflowName: 'Nhắc nhở tái mua hàng',
      trigger: {
        name: 'Mỗi ngày lúc 08:00 UTC',
        type: WorkflowTriggerType.CRON,
        settings: {
          type: 'DAYS',
          schedule: { day: 1, hour: 8, minute: 0 },
          outputSchema: {},
        },
        nextStepIds: [findCompaniesStepId],
        position: { x: 0, y: 0 },
      },
      steps: [
        {
          id: findCompaniesStepId,
          name: 'Tìm các công ty đang hoạt động',
          type: WorkflowActionType.FIND_RECORDS,
          valid: true,
          position: { x: 0, y: 180 },
          settings: {
            input: {
              objectName: 'company',
              limit: 200,
              pagination: {
                fetchAll: true,
                maxRecords: 5000,
                pageSize: 200,
              },
              orderBy: {
                gqlOperationOrderBy: [{ name: OrderByDirection.AscNullsLast }],
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [iteratorStepId],
        },
        {
          id: iteratorStepId,
          name: 'Lặp qua từng công ty',
          type: WorkflowActionType.ITERATOR,
          valid: true,
          position: { x: 0, y: 360 },
          settings: {
            input: {
              items: `{{${findCompaniesStepId}.all}}`,
              initialLoopStepIds: [findOpenOpportunitiesStepId],
              shouldContinueOnIterationFailure: true,
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [],
        },
        {
          id: findOpenOpportunitiesStepId,
          name: 'Tìm cơ hội mở cho công ty',
          type: WorkflowActionType.FIND_RECORDS,
          valid: true,
          position: { x: 0, y: 540 },
          settings: {
            input: {
              objectName: 'opportunity',
              limit: 1,
              filter: {
                recordFilterGroups: [openOpportunitiesFilterGroup],
                recordFilters: [
                  {
                    id: uuidv4(),
                    type: 'RELATION',
                    value: `{{${iteratorStepId}.currentItem.id}}`,
                    operand: ViewFilterOperand.IS,
                    fieldMetadataId: 'company',
                    recordFilterGroupId: openOpportunitiesFilterGroup.id,
                  },
                  {
                    id: uuidv4(),
                    type: 'SELECT',
                    value: '["CUSTOMER"]',
                    operand: ViewFilterOperand.IS_NOT,
                    fieldMetadataId: 'stage',
                    recordFilterGroupId: openOpportunitiesFilterGroup.id,
                  },
                ],
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [findOpportunitiesStepId],
        },
        {
          id: findOpportunitiesStepId,
          name: 'Tìm cơ hội đã hoàn thành cho công ty',
          type: WorkflowActionType.FIND_RECORDS,
          valid: true,
          position: { x: 0, y: 720 },
          settings: {
            input: {
              objectName: 'opportunity',
              limit: 1,
              filter: {
                recordFilterGroups: [opportunitiesFilterGroup],
                recordFilters: [
                  {
                    id: uuidv4(),
                    type: 'RELATION',
                    value: `{{${iteratorStepId}.currentItem.id}}`,
                    operand: ViewFilterOperand.IS,
                    fieldMetadataId: 'company',
                    recordFilterGroupId: opportunitiesFilterGroup.id,
                  },
                  {
                    id: uuidv4(),
                    type: 'SELECT',
                    value: '["CUSTOMER"]',
                    operand: ViewFilterOperand.IS,
                    fieldMetadataId: 'stage',
                    recordFilterGroupId: opportunitiesFilterGroup.id,
                  },
                ],
              },
              orderBy: {
                gqlOperationOrderBy: [
                  { closeDate: OrderByDirection.DescNullsLast },
                ],
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [checkReminderStepId],
        },
        {
          id: checkReminderStepId,
          name: 'Kiểm tra xem có nên tạo nhắc nhở tái mua hàng không',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 900 },
          settings: {
            input: {
              logicFunctionId: checkRepurchaseReminder,
              logicFunctionInput: {
                opportunities: `{{${findOpportunitiesStepId}.all}}`,
                openOpportunities: `{{${findOpenOpportunitiesStepId}.all}}`,
                company: `{{${iteratorStepId}.currentItem}}`,
                repurchaseDays,
              },
            },
            outputSchema: {
              shouldCreateReminder: {
                isLeaf: true,
                type: 'boolean',
                label: 'Nên tạo nhắc nhở',
                value: false,
              },
              daysSinceLastOrder: {
                isLeaf: true,
                type: 'number',
                label: 'Số ngày kể từ đơn hàng cuối',
                value: 0,
              },
              assigneeId: {
                isLeaf: true,
                type: 'string',
                label: 'Người phụ trách công việc',
                value: '',
              },
              reminders: {
                isLeaf: true,
                type: 'array',
                label: 'Danh sách nhắc nhở tái mua hàng đủ điều kiện',
                value: [
                  {
                    companyId: '20202020-1111-4111-8111-111111111111',
                    companyName: 'ACME Corp',
                    daysSinceLastOrder: 30,
                    assigneeId: '20202020-1111-4111-8111-111111111111',
                  },
                ],
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [reminderIteratorStepId],
        },
        {
          id: reminderIteratorStepId,
          name: 'Tạo công việc khi đến hạn nhắc nhở tái mua hàng',
          type: WorkflowActionType.ITERATOR,
          valid: true,
          position: { x: 0, y: 1080 },
          settings: {
            input: {
              items: `{{${checkReminderStepId}.reminders}}`,
              initialLoopStepIds: [createTaskStepId],
              shouldContinueOnIterationFailure: true,
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [iteratorStepId],
        },
        {
          id: createTaskStepId,
          name: 'Tạo công việc tái mua hàng',
          type: WorkflowActionType.CREATE_RECORD,
          valid: true,
          position: { x: 0, y: 1260 },
          settings: {
            input: {
              objectName: 'task',
              objectRecord: {
                title: `Theo dõi tái mua hàng: "{{${reminderIteratorStepId}.currentItem.companyName}}"`,
                bodyV2: buildTaskBody(
                  `"{{${reminderIteratorStepId}.currentItem.companyName}}" chưa mua hàng lại sau {{${reminderIteratorStepId}.currentItem.daysSinceLastOrder}} ngày.\nLiên kết: ` +
                    companyUrl,
                ),
                assignee: {
                  id: `{{${reminderIteratorStepId}.currentItem.assigneeId}}`,
                },
                status: 'TODO',
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [reminderIteratorStepId],
        },
      ] satisfies WorkflowAction[] as WorkflowAction[],
    };
  }
}
