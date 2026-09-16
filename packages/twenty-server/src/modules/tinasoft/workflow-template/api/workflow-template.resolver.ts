import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';
import { type AppLocale } from 'twenty-shared/translations';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkflowVersionDTO } from 'src/engine/core-modules/workflow/dtos/workflow-version.dto';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { RequestLocale } from 'src/engine/decorators/locale/request-locale.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PermissionsGraphqlApiExceptionFilter } from 'src/engine/metadata-modules/permissions/utils/permissions-graphql-api-exception.filter';
import { CreateWorkflowFromTemplateInput } from 'src/modules/tinasoft/workflow-template/api/dtos/create-workflow-from-template.input';
import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { WorkflowTemplateWorkspaceService } from 'src/modules/tinasoft/workflow-template/services/workflow-template.workspace-service';

@CoreResolver()
@UsePipes(ResolverValidationPipe)
@UseGuards(
  WorkspaceAuthGuard,
  UserAuthGuard,
  SettingsPermissionGuard(PermissionFlagType.WORKFLOWS),
)
@UseFilters(
  PermissionsGraphqlApiExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
)
export class WorkflowTemplateResolver {
  constructor(
    private readonly workflowTemplateWorkspaceService: WorkflowTemplateWorkspaceService,
  ) {}

  @Query(() => [WorkflowTemplateDTO])
  async workflowTemplates(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @RequestLocale() locale: AppLocale | undefined,
  ): Promise<WorkflowTemplateDTO[]> {
    return this.workflowTemplateWorkspaceService.getWorkflowTemplates({
      workspaceDisplayName: workspace.displayName ?? '',
      locale,
    });
  }

  @Mutation(() => WorkflowVersionDTO)
  async createWorkflowFromTemplate(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
    @RequestLocale() locale: AppLocale | undefined,
    @Args('input')
    { templateId, settings = {} }: CreateWorkflowFromTemplateInput,
  ): Promise<WorkflowVersionDTO> {
    return this.workflowTemplateWorkspaceService.createWorkflowFromTemplate({
      workspaceId,
      templateId,
      settings,
      locale,
    });
  }
}
