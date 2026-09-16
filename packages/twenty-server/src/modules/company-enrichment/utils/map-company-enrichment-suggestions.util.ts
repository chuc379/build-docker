import { isNonEmptyString } from '@sniptt/guards';

import { type CompanyEnrichmentAiOutput } from 'src/modules/company-enrichment/constants/company-enrichment-ai-schema.const';
import {
  type CompanyEnrichmentFieldSource,
  type CompanyEnrichmentSuggestedFields,
  type CompanyEnrichmentStatus,
} from 'src/modules/company-enrichment/types/company-enrichment-suggestions.type';
import { getCompanyNameFromDomainName } from 'src/modules/contact-creation-manager/utils/get-company-name-from-domain-name.util';

export type TwentyCompaniesLookupResult = {
  name: string | null;
  city: string | null;
};

const emptyAddress = () => ({
  addressStreet1: null,
  addressStreet2: null,
  addressCity: null,
  addressState: null,
  addressPostcode: null,
  addressCountry: null,
  addressLat: null,
  addressLng: null,
});

const toMicros = (amount: number): number => Math.round(amount * 1_000_000);

export const mapCompanyEnrichmentSuggestions = ({
  domain,
  twentyCompanies,
  aiOutput,
}: {
  domain: string;
  twentyCompanies: TwentyCompaniesLookupResult | null;
  aiOutput: CompanyEnrichmentAiOutput | null;
}): {
  suggestedFields: CompanyEnrichmentSuggestedFields;
  fieldSources: CompanyEnrichmentFieldSource[];
  status: CompanyEnrichmentStatus;
} => {
  const fieldSources: CompanyEnrichmentFieldSource[] = [];

  const nameFromTwenty = isNonEmptyString(twentyCompanies?.name)
    ? twentyCompanies.name
    : null;
  const nameFromAi = isNonEmptyString(aiOutput?.name) ? aiOutput.name : null;
  const name =
    nameFromTwenty ?? nameFromAi ?? getCompanyNameFromDomainName(domain);

  if (nameFromTwenty !== null) {
    fieldSources.push({
      fieldName: 'name',
      source: 'twenty-companies',
      confidence: 'high',
    });
  } else if (nameFromAi !== null) {
    fieldSources.push({
      fieldName: 'name',
      source: 'ai',
      confidence: 'medium',
    });
  } else {
    fieldSources.push({
      fieldName: 'name',
      source: 'domain-fallback',
      confidence: 'low',
    });
  }

  const cityFromTwenty = isNonEmptyString(twentyCompanies?.city)
    ? twentyCompanies.city
    : null;
  const addressCity =
    (isNonEmptyString(aiOutput?.addressCity) ? aiOutput.addressCity : null) ??
    cityFromTwenty;

  const hasAddressParts =
    isNonEmptyString(aiOutput?.addressStreet1) ||
    isNonEmptyString(addressCity) ||
    isNonEmptyString(aiOutput?.addressState) ||
    isNonEmptyString(aiOutput?.addressPostcode) ||
    isNonEmptyString(aiOutput?.addressCountry);

  const address = hasAddressParts
    ? {
        ...emptyAddress(),
        addressStreet1: isNonEmptyString(aiOutput?.addressStreet1)
          ? aiOutput.addressStreet1
          : null,
        addressCity,
        addressState: isNonEmptyString(aiOutput?.addressState)
          ? aiOutput.addressState
          : null,
        addressPostcode: isNonEmptyString(aiOutput?.addressPostcode)
          ? aiOutput.addressPostcode
          : null,
        addressCountry: isNonEmptyString(aiOutput?.addressCountry)
          ? aiOutput.addressCountry
          : null,
      }
    : null;

  if (address !== null) {
    fieldSources.push({
      fieldName: 'address',
      source:
        cityFromTwenty !== null && !isNonEmptyString(aiOutput?.addressCity)
          ? 'twenty-companies'
          : 'ai',
      confidence: isNonEmptyString(aiOutput?.addressCountry) ? 'medium' : 'low',
    });
  }

  const linkedinUrl = isNonEmptyString(aiOutput?.linkedinUrl)
    ? aiOutput.linkedinUrl
    : null;
  const linkedinLink =
    linkedinUrl !== null
      ? {
          primaryLinkUrl: linkedinUrl,
          primaryLinkLabel: null,
          secondaryLinks: null,
        }
      : null;

  if (linkedinLink !== null) {
    fieldSources.push({
      fieldName: 'linkedinLink',
      source: 'ai',
      confidence: 'medium',
    });
  }

  const annualRevenueAmount =
    typeof aiOutput?.annualRevenueAmount === 'number'
      ? aiOutput.annualRevenueAmount
      : null;

  let annualRevenue: CompanyEnrichmentSuggestedFields['annualRevenue'] = null;

  if (annualRevenueAmount !== null && annualRevenueAmount > 0) {
    annualRevenue = {
      amountMicros: toMicros(annualRevenueAmount),
      currencyCode: isNonEmptyString(aiOutput?.annualRevenueCurrencyCode)
        ? aiOutput.annualRevenueCurrencyCode.toUpperCase()
        : 'USD',
    };
  }

  if (annualRevenue !== null) {
    fieldSources.push({
      fieldName: 'annualRevenue',
      source: 'ai',
      confidence: 'low',
    });
  }

  const suggestedFields: CompanyEnrichmentSuggestedFields = {
    name,
    address,
    linkedinLink,
    annualRevenue,
  };

  const filledCount = [
    suggestedFields.name,
    suggestedFields.address,
    suggestedFields.linkedinLink,
    suggestedFields.annualRevenue,
  ].filter((value) => value !== null && value !== undefined).length;

  const status: CompanyEnrichmentStatus =
    filledCount >= 3 ? 'MATCHED' : filledCount >= 1 ? 'PARTIAL' : 'NOT_FOUND';

  return { suggestedFields, fieldSources, status };
};
