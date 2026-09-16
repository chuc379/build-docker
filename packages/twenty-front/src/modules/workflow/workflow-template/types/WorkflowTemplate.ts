import { type WorkflowTemplateRequiredSetting } from 'twenty-shared/workflow';

export type { WorkflowTemplateRequiredSetting };

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  purpose: string;
  category: string;
  icon: string;
  requiredSettings: WorkflowTemplateRequiredSetting[];
};
