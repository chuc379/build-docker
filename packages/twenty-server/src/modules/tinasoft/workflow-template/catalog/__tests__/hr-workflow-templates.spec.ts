import { HrCvIntakeMatchingWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/hr-cv-intake-matching.builder';
import { HrGenerateJobDescriptionWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/hr-generate-job-description.builder';
import { HrScheduleInterviewWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/hr-schedule-interview.builder';
import { HrSendInterviewEmailWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/hr-send-interview-email.builder';
import {
  workflowActionSchema,
  workflowTriggerSchema,
} from 'twenty-shared/workflow';

const hrBuilders = [
  new HrCvIntakeMatchingWorkflowTemplateBuilder(),
  new HrGenerateJobDescriptionWorkflowTemplateBuilder(),
  new HrScheduleInterviewWorkflowTemplateBuilder(),
  new HrSendInterviewEmailWorkflowTemplateBuilder(),
];

const HR_WORKFLOW_TEMPLATES = hrBuilders.map((builder) => ({
  ...builder.getDTO('Test Workspace'),
  build: (context: Parameters<typeof builder.build>[0]) =>
    builder.build(context),
}));

const buildSettings = (
  requiredSettings: (typeof HR_WORKFLOW_TEMPLATES)[number]['requiredSettings'],
) =>
  Object.fromEntries(
    requiredSettings.map((setting) => {
      if (setting.defaultValue) {
        return [setting.key, setting.defaultValue];
      }

      switch (setting.type) {
        case 'email':
          return [setting.key, 'tuyendung@tinasoft.vn'];
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
  requiredSettings: (typeof HR_WORKFLOW_TEMPLATES)[number]['requiredSettings'],
) => ({
  settings: buildSettings(requiredSettings),
  workspaceId: '20202020-1111-4111-8111-111111111111',
  workspaceUrl: 'https://acme.tina-crm.test',
});

describe('HR workflow templates', () => {
  it('contains the 3 HR workflow templates with unique IDs', () => {
    expect(HR_WORKFLOW_TEMPLATES).toHaveLength(4);
    expect(new Set(HR_WORKFLOW_TEMPLATES.map(({ id }) => id)).size).toBe(4);
    expect(HR_WORKFLOW_TEMPLATES.map(({ id }) => id).sort()).toEqual([
      'hr-cv-intake-matching',
      'hr-generate-job-description',
      'hr-schedule-interview',
      'hr-send-interview-email',
    ]);
  });

  it.each(HR_WORKFLOW_TEMPLATES)(
    'builds $id with valid schema and connected graph references',
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

  it('creates CV intake matching workflow with CODE, CREATE_RECORD, and SEND_EMAIL steps', () => {
    const template = HR_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'hr-cv-intake-matching',
    );
    expect(template).toBeDefined();

    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    expect(definition?.trigger.type).toBe('WEBHOOK');
    expect(definition?.steps.map(({ type }) => type)).toEqual([
      'CODE',
      'CREATE_RECORD',
      'SEND_EMAIL',
    ]);
  });

  it('creates Job Description generation workflow with FORM, AI_AGENT, and CREATE_RECORD steps', () => {
    const template = HR_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'hr-generate-job-description',
    );
    expect(template).toBeDefined();

    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    expect(definition?.trigger.type).toBe('MANUAL');
    expect(definition?.steps.map(({ type }) => type)).toEqual([
      'FORM',
      'AI_AGENT',
      'CREATE_RECORD',
    ]);
  });

  it('creates Interview scheduling workflow with FORM, CODE, CREATE_CALENDAR_EVENT, and CREATE_RECORD steps', () => {
    const template = HR_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'hr-schedule-interview',
    );
    expect(template).toBeDefined();

    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    expect(definition?.trigger.type).toBe('MANUAL');
    expect(definition?.steps.map(({ type }) => type)).toEqual([
      'FORM',
      'CODE',
      'CREATE_CALENDAR_EVENT',
      'CREATE_RECORD',
    ]);

    const formStep = definition?.steps.find(({ type }) => type === 'FORM');
    const formFields = (
      formStep?.settings as { input?: Array<{ name: string; type: string }> }
    )?.input;
    expect(formFields?.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'interviewDate',
        'startHour',
        'startMinute',
        'endHour',
        'endMinute',
      ]),
    );
    expect(
      formFields?.find(({ name }) => name === 'interviewDate')?.type,
    ).toBe('DATE');
    for (const timeField of [
      'startHour',
      'startMinute',
      'endHour',
      'endMinute',
    ]) {
      expect(formFields?.find(({ name }) => name === timeField)?.type).toBe(
        'NUMBER',
      );
    }

    const codeStep = definition?.steps.find(({ type }) => type === 'CODE');
    expect(
      (codeStep?.settings as { input?: { logicFunctionId?: string } })?.input
        ?.logicFunctionId,
    ).toBeDefined();

    const calendarEventStep = definition?.steps.find(
      ({ type }) => type === 'CREATE_CALENDAR_EVENT',
    );
    expect(
      (
        calendarEventStep?.settings as {
          input?: { addConferencing?: boolean; attendees?: string };
        }
      )?.input?.addConferencing,
    ).toBe(true);
    expect(
      (
        calendarEventStep?.settings as {
          input?: { attendees?: string };
        }
      )?.input?.attendees,
    ).toContain('candidateEmail');
  });

  it('creates Interview email workflow with FORM, FIND_RECORDS, CODE, and SEND_EMAIL steps', () => {
    const template = HR_WORKFLOW_TEMPLATES.find(
      ({ id }) => id === 'hr-send-interview-email',
    );
    expect(template).toBeDefined();

    const definition = template?.build(
      buildContext(template?.requiredSettings ?? []),
    );
    expect(definition?.trigger.type).toBe('MANUAL');
    expect(definition?.steps.map(({ type }) => type)).toEqual([
      'FORM',
      'FIND_RECORDS',
      'CODE',
      'SEND_EMAIL',
    ]);

    const codeStep = definition?.steps.find(({ type }) => type === 'CODE');
    expect(
      (codeStep?.settings as { input?: { logicFunctionId?: string } })?.input
        ?.logicFunctionId,
    ).toBeDefined();
    expect(
      (
        codeStep?.settings as {
          input?: { logicFunctionInput?: { signature?: string } };
        }
      )?.input?.logicFunctionInput?.signature,
    ).toContain('signature');

    const sendEmailStep = definition?.steps.find(
      ({ type }) => type === 'SEND_EMAIL',
    );
    expect(
      (sendEmailStep?.settings as { input?: { files?: unknown[] } })?.input
        ?.files,
    ).toBeUndefined();
    expect(
      (sendEmailStep?.settings as { input?: { body?: string } })?.input?.body,
    ).toContain('signatureHtml');
  });
});