import { Customer30DayCheckInWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/customer-30-day-check-in.builder';
import { CustomerBirthdayEmailWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/customer-birthday-email.builder';
import { FirstContactFollowUpWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/first-contact-follow-up.builder';
import { NewLeadAlertWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/new-lead-alert.builder';
import { QuoteExpiryReminderWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/quote-expiry-reminder.builder';
import { RepurchaseReminderWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/re-purchase-reminder.builder';
import { isWorkflowSendEmailAction } from 'src/modules/workflow/workflow-executor/workflow-actions/mail-sender/guards/is-workflow-send-email-action.guard';
import {
  type WorkflowFilterAction,
  type WorkflowFindRecordsAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import {
  workflowActionSchema,
  workflowTriggerSchema,
} from 'twenty-shared/workflow';

const builders = [
  new NewLeadAlertWorkflowTemplateBuilder(),
  new FirstContactFollowUpWorkflowTemplateBuilder(),
  new QuoteExpiryReminderWorkflowTemplateBuilder(),
  new Customer30DayCheckInWorkflowTemplateBuilder(),
  new RepurchaseReminderWorkflowTemplateBuilder(),
  new CustomerBirthdayEmailWorkflowTemplateBuilder(),
];

const CRM_WORKFLOW_TEMPLATES = builders.map((builder) => ({
  ...builder.getDTO('Test Workspace'),
  build: (context: Parameters<typeof builder.build>[0]) =>
    builder.build(context),
}));

const buildSettings = (
  requiredSettings: (typeof CRM_WORKFLOW_TEMPLATES)[number]['requiredSettings'],
) =>
  Object.fromEntries(
    requiredSettings.map((setting) => {
      if (setting.defaultValue) {
        return [setting.key, setting.defaultValue];
      }

      switch (setting.type) {
        case 'email':
          return [setting.key, 'team@example.com'];
        case 'number':
          return [setting.key, '1'];
        case 'text':
          return [setting.key, 'Configured value'];
        default:
          return [setting.key, ''];
      }
    }),
  );

const buildContext = (
  requiredSettings: (typeof CRM_WORKFLOW_TEMPLATES)[number]['requiredSettings'],
) => ({
  settings: buildSettings(requiredSettings),
  workspaceId: '20202020-1111-4111-8111-111111111111',
  workspaceUrl: 'https://acme.tina-crm.test',
});

describe('CRM MVP workflow templates', () => {
  it('contains the 6 expected workflow templates with unique IDs', () => {
    expect(CRM_WORKFLOW_TEMPLATES).toHaveLength(6);
    expect(new Set(CRM_WORKFLOW_TEMPLATES.map(({ id }) => id)).size).toBe(6);
  });

  it.each(CRM_WORKFLOW_TEMPLATES)(
    'builds $id with connected graph references',
    (template) => {
      const definition = template.build(
        buildContext(template.requiredSettings),
      );
      const stepIds = new Set(definition.steps.map(({ id }) => id));

      expect(definition.workflowName).not.toBe('');
      expect(() =>
        workflowTriggerSchema.parse(definition.trigger),
      ).not.toThrow();

      for (const step of definition.steps) {
        expect(() => workflowActionSchema.parse(step)).not.toThrow();
      }

      expect(definition.trigger.nextStepIds ?? []).toEqual(
        expect.arrayContaining(
          (definition.trigger.nextStepIds ?? []).filter((stepId) =>
            stepIds.has(stepId),
          ),
        ),
      );

      for (const nextStepId of definition.trigger.nextStepIds ?? []) {
        expect(stepIds.has(nextStepId)).toBe(true);
      }

      for (const step of definition.steps) {
        for (const nextStepId of step.nextStepIds ?? []) {
          expect(stepIds.has(nextStepId)).toBe(true);
        }
      }
    },
  );

  it('creates configured 30-day check-in workflow', () => {
    const checkInTemplate = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'customer-30-day-check-in',
    );

    expect(checkInTemplate).toBeDefined();

    const checkInDefinition = checkInTemplate?.build(
      buildContext(checkInTemplate?.requiredSettings ?? []),
    );

    expect(checkInDefinition?.steps.map(({ type }) => type)).toEqual([
      'DELAY',
      'FIND_RECORDS',
      'FILTER',
      'FILTER',
      'CREATE_RECORD',
    ]);
  });

  it('stops the first-contact follow-up when the opportunity was deleted', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'first-contact-follow-up',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    const findOpportunityStep = definition?.steps.find(
      ({ name }) => name === 'Tải lại cơ hội',
    );
    const checkExistsStep = definition?.steps.find(
      ({ name }) => name === 'Kiểm tra cơ hội vẫn tồn tại',
    ) as WorkflowFilterAction;

    expect(findOpportunityStep?.nextStepIds).toEqual([checkExistsStep?.id]);
    expect(checkExistsStep?.settings.input.stepFilters).toEqual([
      expect.objectContaining({
        operand: 'IS_NOT_EMPTY',
        stepOutputKey: `{{${findOpportunityStep?.id}.first.id}}`,
      }),
    ]);
  });

  it('rechecks that the opportunity still exists and remains Customer after check-in delay', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'customer-30-day-check-in',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    const findOpportunityStep = definition?.steps.find(
      ({ name }) => name === 'Tải lại cơ hội',
    );
    const customerStageStep = definition?.steps.find(
      ({ name }) => name === 'Kiểm tra cơ hội vẫn ở giai đoạn Khách hàng',
    ) as WorkflowFilterAction;

    expect(findOpportunityStep).toBeDefined();
    expect(customerStageStep?.settings.input.stepFilters).toEqual([
      expect.objectContaining({
        operand: 'IS',
        value: 'CUSTOMER',
        stepOutputKey: `{{${findOpportunityStep?.id}.first.stage}}`,
      }),
    ]);
  });

  it('declares persisted code outputs used by downstream workflow nodes', () => {
    for (const [templateId, outputKeys] of [
      ['quote-expiry-reminder', ['opportunities']],
      [
        're-purchase-reminder',
        [
          'shouldCreateReminder',
          'daysSinceLastOrder',
          'assigneeId',
          'reminders',
        ],
      ],
      ['customer-birthday-email', ['people']],
    ] as const) {
      const template = CRM_WORKFLOW_TEMPLATES.find(
        ({ id }) => id === templateId,
      );
      const definition = template?.build(
        buildContext(template?.requiredSettings ?? []),
      );
      const codeSteps = definition?.steps.filter(({ type }) => type === 'CODE');

      expect(codeSteps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            settings: expect.objectContaining({
              outputSchema: expect.objectContaining(
                Object.fromEntries(
                  outputKeys.map((key) => [key, expect.anything()]),
                ),
              ),
            }),
          }),
        ]),
      );
    }
  });

  it.each([
    ['quote-expiry-reminder', 'opportunities'],
    ['re-purchase-reminder', 'reminders'],
    ['customer-birthday-email', 'people'],
  ] as const)(
    'declares sample arrays for %s so iterator item schemas can be inferred',
    (templateId, outputKey) => {
      const template = CRM_WORKFLOW_TEMPLATES.find(
        ({ id }) => id === templateId,
      );
      const definition = template?.build(
        buildContext(template?.requiredSettings ?? []),
      );
      const codeStep = definition?.steps.find((step) => {
        if (step.type !== 'CODE') {
          return false;
        }

        const outputSchema = step.settings.outputSchema as
          | Record<string, { value?: unknown }>
          | undefined;

        return outputKey in (outputSchema ?? {});
      });

      expect(codeStep).toBeDefined();

      const outputSchema = codeStep?.settings.outputSchema as
        | Record<string, { value?: unknown }>
        | undefined;
      const arrayValue = outputSchema?.[outputKey]?.value;

      expect(Array.isArray(arrayValue)).toBe(true);
      expect(arrayValue).toHaveLength(1);
    },
  );

  it('filters birthday recipients to VIP or VVIP people', () => {
    const birthdayTemplate = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'customer-birthday-email',
    );
    const definition = birthdayTemplate?.build(
      buildContext(birthdayTemplate?.requiredSettings ?? []),
    );
    const findPeopleStep = definition?.steps.find(
      ({ name }) => name === 'Tìm các liên hệ có sinh nhật',
    ) as WorkflowFindRecordsAction;
    const recordFilters = findPeopleStep?.settings.input.filter?.recordFilters;

    expect(recordFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldMetadataId: 'customerType',
          value: '["VIP"]',
        }),
        expect.objectContaining({
          fieldMetadataId: 'customerType',
          value: '["VVIP"]',
        }),
      ]),
    );
    expect(findPeopleStep?.settings.input.pagination).toEqual({
      fetchAll: true,
      pageSize: 200,
      maxRecords: 5000,
    });
  });

  it.each(['re-purchase-reminder', 'customer-birthday-email'] as const)(
    'continues %s when an iterator action fails',
    (templateId) => {
      const template = CRM_WORKFLOW_TEMPLATES.find(
        ({ id }) => id === templateId,
      );
      const definition = template?.build(
        buildContext(template?.requiredSettings ?? []),
      );
      const iterator = definition?.steps.find(
        ({ type }) => type === 'ITERATOR',
      );

      expect(iterator?.settings.input.shouldContinueOnIterationFailure).toBe(
        true,
      );
    },
  );

  it('finds the latest completed opportunity for each company', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 're-purchase-reminder',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    const findOpportunitiesStep = definition?.steps.find(
      ({ name }) => name === 'Tìm cơ hội đã hoàn thành cho công ty',
    );

    expect(findOpportunitiesStep?.settings.input.limit).toBe(1);
    expect(findOpportunitiesStep?.settings.input.orderBy).toEqual({
      gqlOperationOrderBy: [{ closeDate: 'DescNullsLast' }],
    });
  });

  it('paginates every open opportunity for quote expiry reminders', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'quote-expiry-reminder',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    const findOpportunitiesStep = definition?.steps.find(
      ({ name }) => name === 'Tìm các cơ hội đang mở',
    );

    expect(findOpportunitiesStep?.settings.input.pagination).toEqual({
      fetchAll: true,
      pageSize: 200,
      maxRecords: 5000,
    });
    expect(findOpportunitiesStep?.settings.input.orderBy).toEqual({
      gqlOperationOrderBy: [{ closeDate: 'AscNullsLast' }],
    });
  });

  it('creates follow-up tasks for expiring quotes assigned to opportunity owners', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'quote-expiry-reminder',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    const iteratorStep = definition?.steps.find(
      ({ type }) => type === 'ITERATOR',
    );
    const createTaskStep = definition?.steps.find(
      ({ name }) =>
        name === 'Tạo công việc theo dõi cho người phụ trách cơ hội',
    );

    expect(iteratorStep?.settings.input.initialLoopStepIds).toEqual([
      createTaskStep?.id,
    ]);
    expect(createTaskStep?.type).toBe('CREATE_RECORD');
    expect(createTaskStep?.settings.input.objectName).toBe('task');
    expect(createTaskStep?.settings.input.objectRecord.assignee.id).toBe(
      `{{${iteratorStep?.id}.currentItem.ownerId}}`,
    );
    expect(createTaskStep?.nextStepIds).toEqual([iteratorStep?.id]);
  });

  it('skips companies with open opportunities before creating re-purchase tasks', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 're-purchase-reminder',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    const findCompaniesStep = definition?.steps.find(
      ({ name }) => name === 'Tìm các công ty đang hoạt động',
    );
    const findOpenOpportunitiesStep = definition?.steps.find(
      ({ name }) => name === 'Tìm cơ hội mở cho công ty',
    );
    const reminderIteratorStep = definition?.steps.find(
      ({ name }) => name === 'Tạo công việc khi đến hạn nhắc nhở tái mua hàng',
    );
    const createTaskStep = definition?.steps.find(
      ({ name }) => name === 'Tạo công việc tái mua hàng',
    );
    const openOpportunityFilters =
      findOpenOpportunitiesStep?.settings.input.filter?.recordFilters;

    expect(findCompaniesStep?.settings.input.pagination).toEqual({
      fetchAll: true,
      pageSize: 200,
      maxRecords: 5000,
    });
    expect(openOpportunityFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldMetadataId: 'stage',
          operand: 'IS_NOT',
          value: '["CUSTOMER"]',
        }),
      ]),
    );
    expect(definition?.steps.some(({ type }) => type === 'IF_ELSE')).toBe(
      false,
    );
    expect(reminderIteratorStep?.settings.input).toEqual(
      expect.objectContaining({ initialLoopStepIds: [createTaskStep?.id] }),
    );
  });

  it('runs birthday checks at 01:00 UTC', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'customer-birthday-email',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );

    expect(definition?.trigger.settings.schedule).toEqual({
      day: 1,
      hour: 1,
      minute: 0,
    });
  });

  it('builds every template email as branded HTML', () => {
    const sendEmailSteps = CRM_WORKFLOW_TEMPLATES.flatMap((template) => {
      const definition = template.build(
        buildContext(template.requiredSettings),
      );

      return definition.steps.filter(isWorkflowSendEmailAction);
    });

    expect(sendEmailSteps).toHaveLength(2);

    for (const sendEmailStep of sendEmailSteps) {
      expect(sendEmailStep.settings.input.body).toContain('<!doctype html>');
      expect(sendEmailStep.settings.input.body).toContain(
        'https://tinacrm.com/img/logo-crm.png',
      );
      expect(sendEmailStep.settings.input.body).toContain(
        '<table role="presentation"',
      );
      expect(sendEmailStep.settings.input.body).not.toContain('{"type":"doc"');
    }
  });

  it('builds lead alert template with Vietnamese email content', () => {
    const template = CRM_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'new-lead-alert',
    );
    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    const sendEmailStep = definition?.steps.find(isWorkflowSendEmailAction);
    const emailBody = sendEmailStep?.settings.input.body ?? '';

    expect(definition?.workflowName).toBe('Thông báo khách hàng tiềm năng mới');
    expect(definition?.trigger.name).toBe(
      'Khách hàng tiềm năng được cập nhật email',
    );
    expect(sendEmailStep?.settings.input.subject).toContain(
      'Khách hàng tiềm năng mới:',
    );
    expect(emailBody).toContain('<!doctype html>');
    expect(emailBody).toContain('Mở hồ sơ khách hàng');
    expect(emailBody).toContain('/object/person/');
    expect(emailBody).toContain('alt="Tina CRM"');
  });
});
