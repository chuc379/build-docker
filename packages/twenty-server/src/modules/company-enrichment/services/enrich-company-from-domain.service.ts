import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { generateText } from 'ai';
import { type AxiosInstance } from 'axios';
import { TWENTY_COMPANIES_BASE_URL } from 'twenty-shared/constants';

import { BillingUsageService } from 'src/engine/core-modules/billing/services/billing-usage.service';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { getCallLevelProviderOptions } from 'src/engine/metadata-modules/ai/ai-chat/utils/provider-options.util';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { AI_TELEMETRY_CONFIG } from 'src/engine/metadata-modules/ai/ai-models/constants/ai-telemetry.const';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { type CompanyEnrichmentAiOutput } from 'src/modules/company-enrichment/constants/company-enrichment-ai-schema.const';
import { EnrichCompanyFromDomainDTO } from 'src/modules/company-enrichment/dtos/enrich-company-from-domain.dto';
import { mapCompanyEnrichmentSuggestions } from 'src/modules/company-enrichment/utils/map-company-enrichment-suggestions.util';
import { normalizeCompanyDomain } from 'src/modules/company-enrichment/utils/normalize-company-domain.util';
import { parseCompanyEnrichmentAiText } from 'src/modules/company-enrichment/utils/parse-company-enrichment-ai-text.util';

@Injectable()
export class EnrichCompanyFromDomainService {
  private readonly logger = new Logger(EnrichCompanyFromDomainService.name);
  private readonly twentyCompaniesHttp: AxiosInstance;

  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
    private readonly aiModelRegistryService: AiModelRegistryService,
    private readonly aiBillingService: AiBillingService,
    private readonly billingUsageService: BillingUsageService,
  ) {
    this.twentyCompaniesHttp = this.secureHttpClientService.getHttpClient({
      baseURL: TWENTY_COMPANIES_BASE_URL,
      timeout: 8_000,
    });
  }

  async enrich({
    domain: domainInput,
    workspace,
    userWorkspaceId,
  }: {
    domain: string;
    workspace: WorkspaceEntity;
    userWorkspaceId: string;
  }): Promise<EnrichCompanyFromDomainDTO> {
    const domain = normalizeCompanyDomain(domainInput);

    if (domain === null) {
      return {
        domain: domainInput,
        status: 'ERROR',
        suggestedFields: null,
        fieldSources: null,
        message: 'Invalid company domain or URL.',
      };
    }

    const twentyCompanies = await this.lookupTwentyCompanies(domain);

    let aiOutput: CompanyEnrichmentAiOutput | null = null;

    try {
      aiOutput = await this.enrichWithAi({
        domain,
        twentyCompanies,
        workspace,
        userWorkspaceId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to enrich company from domain.';

      this.logger.warn(
        `AI enrichment failed for domain ${domain}: ${errorMessage}`,
      );

      if (twentyCompanies === null) {
        return {
          domain,
          status: 'ERROR',
          suggestedFields: null,
          fieldSources: null,
          message: errorMessage,
        };
      }
    }

    const { suggestedFields, fieldSources, status } =
      mapCompanyEnrichmentSuggestions({
        domain,
        twentyCompanies,
        aiOutput,
      });

    this.logger.log(
      `Company enrichment for ${domain}: status=${status}, fields=${Object.keys(
        suggestedFields,
      )
        .filter(
          (fieldName) =>
            suggestedFields[fieldName as keyof typeof suggestedFields] !== null,
        )
        .join(',')}`,
    );

    return {
      domain,
      status,
      suggestedFields,
      fieldSources,
      message:
        status === 'NOT_FOUND'
          ? 'No company information found for this domain.'
          : null,
    };
  }

  private async lookupTwentyCompanies(domain: string): Promise<{
    name: string | null;
    city: string | null;
  } | null> {
    try {
      const response = await this.twentyCompaniesHttp.get(`/${domain}`);
      const data = response.data as {
        name?: string;
        city?: string;
      };

      return {
        name: isNonEmptyString(data?.name) ? data.name : null,
        city: isNonEmptyString(data?.city) ? data.city : null,
      };
    } catch {
      return null;
    }
  }

  private async enrichWithAi({
    domain,
    twentyCompanies,
    workspace,
    userWorkspaceId,
  }: {
    domain: string;
    twentyCompanies: { name: string | null; city: string | null } | null;
    workspace: WorkspaceEntity;
    userWorkspaceId: string;
  }): Promise<CompanyEnrichmentAiOutput> {
    if (this.aiModelRegistryService.getAvailableModels().length === 0) {
      throw new AiException(
        'No AI models are available. Please configure at least one AI provider API key.',
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    await this.billingUsageService.hasAvailableCreditsOrThrow(workspace.id);

    const resolvedModelId = workspace.smartModel ?? workspace.fastModel;

    this.aiModelRegistryService.validateModelAvailability(
      resolvedModelId,
      workspace,
    );

    const registeredModel = this.aiModelRegistryService.resolveModelForAgent({
      modelId: resolvedModelId,
    });

    const knownContext = [
      `Domain: ${domain}`,
      twentyCompanies?.name ? `Known name: ${twentyCompanies.name}` : null,
      twentyCompanies?.city ? `Known city: ${twentyCompanies.city}` : null,
    ]
      .filter((value): value is string => value !== null)
      .join('\n');

    let result: Awaited<ReturnType<typeof generateText>> | undefined;

    try {
      // OpenRouter/DeepSeek does not reliably support AI SDK Output.object /
      // responseFormat — ask for JSON in the prompt and parse it ourselves.
      result = await generateText({
        model: registeredModel.model,
        system: `You enrich CRM company records from a website domain for a record detail UI that shows: Name, Address, LinkedIn, Annual Revenue.

Return ONLY a single JSON object (no markdown, no commentary) with exactly these keys:
name, linkedinUrl, annualRevenueAmount, annualRevenueCurrencyCode, addressStreet1, addressCity, addressState, addressPostcode, addressCountry.

Rules:
- Always provide the best real company "name" you can (official brand / legal trading name). Prefer Known name from context when present. Never leave name null if you can infer a brand from the domain.
- Fill LinkedIn company page URL, address parts, and annual revenue whenever you have publicly credible knowledge.
- Use null only when you truly do not know. Do not invent LinkedIn URLs, street addresses, or revenue figures.
- annualRevenueAmount must be a number in the main currency unit (e.g. dollars), not micros.`,
        prompt: `Suggest company fields for this domain. Maximize filled UI fields (name, address, linkedin, annual revenue).

${knownContext}`,
        providerOptions: getCallLevelProviderOptions({
          sdkPackage: registeredModel.sdkPackage,
          providerOptions: undefined,
          promptCacheKey: `company-enrich:${domain}`,
        }),
        experimental_telemetry: AI_TELEMETRY_CONFIG,
      });

      this.logger.log(
        `Company enrichment AI raw response for ${domain} (len=${result.text.length})`,
      );

      return parseCompanyEnrichmentAiText(result.text);
    } finally {
      const billingResult = result;

      if (billingResult !== undefined) {
        void this.aiBillingService.calculateAndBillUsage(
          resolvedModelId,
          {
            usage: billingResult.usage,
            cacheCreationTokens:
              billingResult.usage.inputTokenDetails?.cacheWriteTokens ?? 0,
          },
          workspace.id,
          UsageOperationType.AI_WORKFLOW_TOKEN,
          null,
          userWorkspaceId,
        );
      }
    }
  }
}
