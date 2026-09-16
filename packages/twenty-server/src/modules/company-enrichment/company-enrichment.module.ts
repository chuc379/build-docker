import { Module } from '@nestjs/common';

import { BillingModule } from 'src/engine/core-modules/billing/billing.module';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { AiBillingModule } from 'src/engine/metadata-modules/ai/ai-billing/ai-billing.module';
import { AiModelsModule } from 'src/engine/metadata-modules/ai/ai-models/ai-models.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { CompanyEnrichmentResolver } from 'src/modules/company-enrichment/resolvers/company-enrichment.resolver';
import { EnrichCompanyFromDomainService } from 'src/modules/company-enrichment/services/enrich-company-from-domain.service';

@Module({
  imports: [
    SecureHttpClientModule,
    AiModelsModule,
    AiBillingModule,
    BillingModule,
    PermissionsModule,
  ],
  providers: [EnrichCompanyFromDomainService, CompanyEnrichmentResolver],
  exports: [EnrichCompanyFromDomainService],
})
export class CompanyEnrichmentModule {}
