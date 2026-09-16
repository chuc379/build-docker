import { mapCompanyEnrichmentSuggestions } from 'src/modules/company-enrichment/utils/map-company-enrichment-suggestions.util';
import { normalizeCompanyDomain } from 'src/modules/company-enrichment/utils/normalize-company-domain.util';

describe('normalizeCompanyDomain', () => {
  it('should normalize urls to bare domains', () => {
    expect(normalizeCompanyDomain('https://www.acme.com/about')).toBe(
      'acme.com',
    );
    expect(normalizeCompanyDomain('ACME.com')).toBe('acme.com');
  });

  it('should return null for invalid domains', () => {
    expect(normalizeCompanyDomain('')).toBeNull();
    expect(normalizeCompanyDomain('not-a-domain')).toBeNull();
    expect(normalizeCompanyDomain(null)).toBeNull();
  });
});

describe('mapCompanyEnrichmentSuggestions', () => {
  it('should prefer twenty-companies name and map ai fields', () => {
    const result = mapCompanyEnrichmentSuggestions({
      domain: 'acme.com',
      twentyCompanies: { name: 'Acme Inc', city: 'San Francisco' },
      aiOutput: {
        name: 'Ignored Name',
        linkedinUrl: 'https://linkedin.com/company/acme',
        annualRevenueAmount: 10_000_000,
        annualRevenueCurrencyCode: 'usd',
        addressStreet1: '1 Market St',
        addressCity: null,
        addressState: 'CA',
        addressPostcode: '94105',
        addressCountry: 'United States',
      },
    });

    expect(result.status).toBe('MATCHED');
    expect(result.suggestedFields.name).toBe('Acme Inc');
    expect(result.suggestedFields.address?.addressCity).toBe('San Francisco');
    expect(result.suggestedFields.address?.addressStreet1).toBe('1 Market St');
    expect(result.suggestedFields.linkedinLink?.primaryLinkUrl).toBe(
      'https://linkedin.com/company/acme',
    );
    expect(result.suggestedFields.annualRevenue).toEqual({
      amountMicros: 10_000_000_000_000,
      currencyCode: 'USD',
    });
  });

  it('should fall back to domain-derived name when no sources', () => {
    const result = mapCompanyEnrichmentSuggestions({
      domain: 'acme.com',
      twentyCompanies: null,
      aiOutput: null,
    });

    expect(result.status).toBe('PARTIAL');
    expect(result.suggestedFields.name).toBeTruthy();
    expect(result.suggestedFields.address).toBeNull();
    expect(result.suggestedFields.linkedinLink).toBeNull();
    expect(result.suggestedFields.annualRevenue).toBeNull();
  });
});
