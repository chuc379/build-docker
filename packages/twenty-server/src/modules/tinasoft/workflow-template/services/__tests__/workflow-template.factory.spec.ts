import { Test, type TestingModule } from '@nestjs/testing';

import { type IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  WORKFLOW_TEMPLATE_BUILDER,
  WORKFLOW_TEMPLATE_BUILDERS,
} from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template-builder.constants';
import { WorkflowTemplateFactory } from 'src/modules/tinasoft/workflow-template/services/workflow-template.factory';

describe('WorkflowTemplateFactory', () => {
  let factory: WorkflowTemplateFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowTemplateFactory,
        ...WORKFLOW_TEMPLATE_BUILDERS,
        {
          provide: WORKFLOW_TEMPLATE_BUILDER,
          useFactory: (...builders: IWorkflowTemplateBuilder[]) => builders,
          inject: [...WORKFLOW_TEMPLATE_BUILDERS],
        },
      ],
    }).compile();

    factory = module.get(WorkflowTemplateFactory);
  });

  it('returns all 8 workflow template builders', () => {
    const dtos = factory.getAllDTOs({ workspaceDisplayName: 'Acme' });

    expect(dtos).toHaveLength(8);
    expect(dtos.map(({ id }) => id).sort()).toEqual(
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

  it('returns a builder for each valid template ID', () => {
    const templateIds = [
      'new-lead-alert',
      'first-contact-follow-up',
      'quote-expiry-reminder',
      'customer-30-day-check-in',
      're-purchase-reminder',
      'customer-birthday-email',
      'hr-cv-intake-matching',
      'hr-generate-job-description',
    ] as const;

    for (const templateId of templateIds) {
      const builder = factory.getBuilder(templateId);

      expect(builder.id).toBe(templateId);
    }
  });

  it('throws when the template ID does not exist', () => {
    expect(() => factory.getBuilder('unknown-template')).toThrow(
      'Workflow template "unknown-template" not found',
    );
  });

  it('passes workspace display name and i18n to builder DTOs', () => {
    const dtos = factory.getAllDTOs({ workspaceDisplayName: 'Acme' });
    const birthdayTemplate = dtos.find(
      ({ id }) => id === 'customer-birthday-email',
    );

    expect(birthdayTemplate?.requiredSettings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'workspaceName',
          defaultValue: 'Acme',
        }),
      ]),
    );
  });
});
