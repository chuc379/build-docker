export type CompanyEnrichmentSuggestedAddress = {
  addressStreet1: string | null;
  addressStreet2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostcode: string | null;
  addressCountry: string | null;
  addressLat: number | null;
  addressLng: number | null;
};

export type CompanyEnrichmentSuggestedLinks = {
  primaryLinkUrl: string | null;
  primaryLinkLabel: string | null;
  secondaryLinks: { url: string; label: string | null }[] | null;
};

export type CompanyEnrichmentSuggestedCurrency = {
  amountMicros: number | null;
  currencyCode: string | null;
};

export type CompanyEnrichmentSuggestedFields = {
  name: string | null;
  address: CompanyEnrichmentSuggestedAddress | null;
  linkedinLink: CompanyEnrichmentSuggestedLinks | null;
  annualRevenue: CompanyEnrichmentSuggestedCurrency | null;
};

export type CompanyEnrichmentFieldSource = {
  fieldName: string;
  source: string;
  confidence: 'high' | 'medium' | 'low' | null;
};

export type CompanyEnrichmentStatus =
  | 'MATCHED'
  | 'PARTIAL'
  | 'NOT_FOUND'
  | 'ERROR';
