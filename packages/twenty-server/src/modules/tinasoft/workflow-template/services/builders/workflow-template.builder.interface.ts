import { type I18n } from '@lingui/core';

import { type WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import {
  type WorkflowTemplateBuildContext,
  type WorkflowTemplateDefinition,
  type WorkflowTemplateId,
} from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';

export interface IWorkflowTemplateBuilder {
  readonly id: WorkflowTemplateId;
  getDTO(workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO;
  build(context: WorkflowTemplateBuildContext): WorkflowTemplateDefinition;
}
