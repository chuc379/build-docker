import {
  buildCompanyEnrichmentUpdateInput,
  getDefaultSelectedCompanyEnrichmentFields,
  isCompanyEnrichmentFieldEmpty,
} from '@/companies/utils/companyEnrichmentApply';

describe('companyEnrichmentApply.util', () => {
  const suggestedFields = {
    name: 'Acme',
    address: {
      addressStreet1: '1 Market',
      addressStreet2: null,
      addressCity: 'SF',
      addressState: 'CA',
      addressPostcode: '94105',
      addressCountry: 'US',
      addressLat: null,
      addressLng: null,
    },
    linkedinLink: {
      primaryLinkUrl: 'https://linkedin.com/company/acme',
      primaryLinkLabel: null,
      secondaryLinks: null,
    },
    annualRevenue: {
      amountMicros: 1_000_000_000_000,
      currencyCode: 'USD',
    },
  };

  it('should detect empty company enrichment fields', () => {
    expect(
      isCompanyEnrichmentFieldEmpty({
        fieldName: 'name',
        record: { id: '1', name: '' },
      }),
    ).toBe(true);

    expect(
      isCompanyEnrichmentFieldEmpty({
        fieldName: 'name',
        record: { id: '1', name: 'Existing' },
      }),
    ).toBe(false);
  });

  it('should treat Untitled as empty name', () => {
    expect(
      isCompanyEnrichmentFieldEmpty({
        fieldName: 'name',
        record: { id: '1', name: 'Untitled' },
      }),
    ).toBe(true);
  });

  it('should select only empty fields by default', () => {
    const selected = getDefaultSelectedCompanyEnrichmentFields({
      suggestedFields,
      record: {
        id: '1',
        name: 'Existing',
        address: {
          addressStreet1: '',
          addressStreet2: '',
          addressCity: '',
          addressState: '',
          addressPostcode: '',
          addressCountry: '',
        },
        linkedinLink: { primaryLinkUrl: '' },
        annualRevenue: { amountMicros: null, currencyCode: 'USD' },
      },
    });

    expect(selected).toEqual(
      expect.arrayContaining(['address', 'linkedinLink', 'annualRevenue']),
    );
    expect(selected).not.toContain('name');
  });

  it('should build update payload from selected fields', () => {
    expect(
      buildCompanyEnrichmentUpdateInput({
        suggestedFields,
        selectedFields: ['name', 'linkedinLink'],
      }),
    ).toEqual({
      name: 'Acme',
      linkedinLink: suggestedFields.linkedinLink,
    });
  });
});
