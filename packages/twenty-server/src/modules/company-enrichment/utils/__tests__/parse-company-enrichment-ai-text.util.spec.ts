import { parseCompanyEnrichmentAiText } from 'src/modules/company-enrichment/utils/parse-company-enrichment-ai-text.util';

describe('parseCompanyEnrichmentAiText', () => {
  it('should parse raw json', () => {
    const result = parseCompanyEnrichmentAiText(`{
      "name": "Acme",
      "linkedinUrl": null,
      "annualRevenueAmount": 1000000,
      "annualRevenueCurrencyCode": "USD",
      "addressStreet1": null,
      "addressCity": "SF",
      "addressState": null,
      "addressPostcode": null,
      "addressCountry": "US"
    }`);

    expect(result.name).toBe('Acme');
    expect(result.addressCity).toBe('SF');
    expect(result.annualRevenueAmount).toBe(1_000_000);
  });

  it('should parse fenced json', () => {
    const result = parseCompanyEnrichmentAiText(`Here you go:
\`\`\`json
{
  "name": "TinaSoft",
  "linkedinUrl": "https://linkedin.com/company/tinasoft",
  "annualRevenueAmount": null,
  "annualRevenueCurrencyCode": null,
  "addressStreet1": null,
  "addressCity": "Hanoi",
  "addressState": null,
  "addressPostcode": null,
  "addressCountry": "Vietnam"
}
\`\`\``);

    expect(result.name).toBe('TinaSoft');
    expect(result.addressCountry).toBe('Vietnam');
  });
});
