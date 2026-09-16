import { Customer30DayCheckInWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/customer-30-day-check-in.builder';
import { CustomerBirthdayEmailWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/customer-birthday-email.builder';
import { FirstContactFollowUpWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/first-contact-follow-up.builder';
import { HrCvIntakeMatchingWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/hr-cv-intake-matching.builder';
import { HrGenerateJobDescriptionWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/hr-generate-job-description.builder';
import { HrScheduleInterviewWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/hr-schedule-interview.builder';
import { NewLeadAlertWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/new-lead-alert.builder';
import { QuoteExpiryReminderWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/quote-expiry-reminder.builder';
import { RepurchaseReminderWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/re-purchase-reminder.builder';
import { type IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';

export const WORKFLOW_TEMPLATE_BUILDER = 'WORKFLOW_TEMPLATE_BUILDER';

export const WORKFLOW_TEMPLATE_BUILDERS: readonly (new () => IWorkflowTemplateBuilder)[] =
  [
    NewLeadAlertWorkflowTemplateBuilder,
    FirstContactFollowUpWorkflowTemplateBuilder,
    QuoteExpiryReminderWorkflowTemplateBuilder,
    Customer30DayCheckInWorkflowTemplateBuilder,
    RepurchaseReminderWorkflowTemplateBuilder,
    CustomerBirthdayEmailWorkflowTemplateBuilder,
    HrCvIntakeMatchingWorkflowTemplateBuilder,
    HrGenerateJobDescriptionWorkflowTemplateBuilder,
    HrScheduleInterviewWorkflowTemplateBuilder,
  ];
