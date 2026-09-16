import { UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { EnrichCompanyFromDomainDTO } from 'src/modules/company-enrichment/dtos/enrich-company-from-domain.dto';
import { EnrichCompanyFromDomainInput } from 'src/modules/company-enrichment/dtos/enrich-company-from-domain.input';
import { EnrichCompanyFromDomainService } from 'src/modules/company-enrichment/services/enrich-company-from-domain.service';

@UseGuards(WorkspaceAuthGuard, SettingsPermissionGuard(PermissionFlagType.AI))
@UsePipes(ResolverValidationPipe)
@MetadataResolver(() => EnrichCompanyFromDomainDTO)
export class CompanyEnrichmentResolver {
  constructor(
    private readonly enrichCompanyFromDomainService: EnrichCompanyFromDomainService,
  ) {}

  @Mutation(() => EnrichCompanyFromDomainDTO)
  async enrichCompanyFromDomain(
    @Args('input') input: EnrichCompanyFromDomainInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<EnrichCompanyFromDomainDTO> {
    return this.enrichCompanyFromDomainService.enrich({
      domain: input.domain,
      workspace,
      userWorkspaceId,
    });
  }
}
