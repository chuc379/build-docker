import { isNonEmptyString } from '@sniptt/guards';

import {
  type CompanyEnrichmentFieldName,
  type CompanyEnrichmentSuggestedFields,
} from '@/companies/types/CompanyEnrichmentSuggestions';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

const PLACEHOLDER_COMPANY_NAMES = new Set(['untitled']);

const isEmptyText = (value: unknown): boolean => {
  if (!isNonEmptyString(value)) {
    return true;
  }

  return PLACEHOLDER_COMPANY_NAMES.has(value.trim().toLowerCase());
};

const isEmptyLinks = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return true;
  }

  const links = value as { primaryLinkUrl?: string | null };

  return !isNonEmptyString(links.primaryLinkUrl);
};

const isEmptyAddress = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return true;
  }

  const address = value as Record<string, unknown>;

  return (
    isEmptyText(address.addressStreet1) &&
    isEmptyText(address.addressStreet2) &&
    isEmptyText(address.addressCity) &&
    isEmptyText(address.addressState) &&
    isEmptyText(address.addressPostcode) &&
    isEmptyText(address.addressCountry)
  );
};

const isEmptyCurrency = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return true;
  }

  const currency = value as { amountMicros?: number | null };

  return (
    currency.amountMicros === null ||
    currency.amountMicros === undefined ||
    currency.amountMicros === 0
  );
};

export const isCompanyEnrichmentFieldEmpty = ({
  fieldName,
  record,
}: {
  fieldName: CompanyEnrichmentFieldName;
  record: ObjectRecord | null | undefined;
}): boolean => {
  const value = record?.[fieldName];

  switch (fieldName) {
    case 'name':
      return isEmptyText(value);
    case 'linkedinLink':
      return isEmptyLinks(value);
    case 'address':
      return isEmptyAddress(value);
    case 'annualRevenue':
      return isEmptyCurrency(value);
    default:
      return true;
  }
};

export const getDefaultSelectedCompanyEnrichmentFields = ({
  suggestedFields,
  record,
}: {
  suggestedFields: CompanyEnrichmentSuggestedFields;
  record: ObjectRecord | null | undefined;
}): CompanyEnrichmentFieldName[] => {
  return (Object.keys(suggestedFields) as CompanyEnrichmentFieldName[]).filter(
    (fieldName) => {
      const suggestion = suggestedFields[fieldName];

      if (suggestion === null || suggestion === undefined) {
        return false;
      }

      return isCompanyEnrichmentFieldEmpty({ fieldName, record });
    },
  );
};

export const buildCompanyEnrichmentUpdateInput = ({
  suggestedFields,
  selectedFields,
}: {
  suggestedFields: CompanyEnrichmentSuggestedFields;
  selectedFields: CompanyEnrichmentFieldName[];
}): Partial<ObjectRecord> => {
  const updateOneRecordInput: Partial<ObjectRecord> = {};

  for (const fieldName of selectedFields) {
    const suggestion = suggestedFields[fieldName];

    if (suggestion === null || suggestion === undefined) {
      continue;
    }

    updateOneRecordInput[fieldName] = suggestion;
  }

  return updateOneRecordInput;
};

export const formatCompanyEnrichmentFieldPreview = ({
  fieldName,
  suggestedFields,
}: {
  fieldName: CompanyEnrichmentFieldName;
  suggestedFields: CompanyEnrichmentSuggestedFields;
}): string => {
  const suggestion = suggestedFields[fieldName];

  if (suggestion === null || suggestion === undefined) {
    return '—';
  }

  switch (fieldName) {
    case 'name':
      return String(suggestion);
    case 'linkedinLink': {
      const links =
        suggestion as CompanyEnrichmentSuggestedFields['linkedinLink'];

      return links?.primaryLinkUrl ?? '—';
    }
    case 'annualRevenue': {
      const currency =
        suggestion as CompanyEnrichmentSuggestedFields['annualRevenue'];

      if (!currency?.amountMicros) {
        return '—';
      }

      const amount = currency.amountMicros / 1_000_000;

      return `${amount.toLocaleString()} ${currency.currencyCode ?? 'USD'}`;
    }
    case 'address': {
      const address = suggestion as CompanyEnrichmentSuggestedFields['address'];

      if (!address) {
        return '—';
      }

      return [
        address.addressStreet1,
        address.addressCity,
        address.addressState,
        address.addressPostcode,
        address.addressCountry,
      ]
        .filter(isNonEmptyString)
        .join(', ');
    }
    default:
      return '—';
  }
};
