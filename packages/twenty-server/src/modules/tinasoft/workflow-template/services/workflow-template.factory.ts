import { Inject, Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { isDefined } from 'twenty-shared/utils';

import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { WORKFLOW_TEMPLATE_BUILDER } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template-builder.constants';
import { type IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import { type WorkflowTemplateId } from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';

@Injectable()
export class WorkflowTemplateFactory {
  private readonly builders: Map<WorkflowTemplateId, IWorkflowTemplateBuilder>;

  constructor(
    @Inject(WORKFLOW_TEMPLATE_BUILDER)
    builders: IWorkflowTemplateBuilder[],
  ) {
    this.builders = new Map<WorkflowTemplateId, IWorkflowTemplateBuilder>(
      builders.map((builder) => [builder.id, builder]),
    );
  }

  getBuilder(templateId: string): IWorkflowTemplateBuilder {
    const builder = this.builders.get(templateId as WorkflowTemplateId);

    if (!isDefined(builder)) {
      throw new Error(`Workflow template "${templateId}" not found`);
    }

    return builder;
  }

  getAllDTOs({
    workspaceDisplayName,
    i18n,
  }: {
    workspaceDisplayName: string;
    i18n?: I18n;
  }): WorkflowTemplateDTO[] {
    return Array.from(this.builders.values()).map((builder) =>
      builder.getDTO(workspaceDisplayName, i18n),
    );
  }
}
