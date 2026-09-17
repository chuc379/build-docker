import { type WorkflowTemplateRequiredSetting } from 'twenty-shared/workflow';

import { type WorkflowVersionDTO } from 'src/engine/core-modules/workflow/dtos/workflow-version.dto';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { type WorkflowTrigger } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

export type { WorkflowTemplateRequiredSetting };

export type WorkflowTemplateId =
  | 'new-lead-alert'
  | 'first-contact-follow-up'
  | 'quote-expiry-reminder'
  | 'customer-30-day-check-in'
  | 're-purchase-reminder'
  | 'customer-birthday-email'
  | 'hr-cv-intake-matching'
  | 'hr-generate-job-description'
  | 'hr-schedule-interview'
  | 'hr-send-interview-email';

export type WorkflowTemplateBuildContext = {
  settings: Record<string, unknown>;
  workspaceId: string;
  workspaceUrl: string;
};

export type WorkflowTemplateDefinition = {
  workflowName: string;
  trigger: WorkflowTrigger;
  steps: WorkflowAction[];
};

export type CreateWorkflowFromTemplateResult = WorkflowVersionDTO;
