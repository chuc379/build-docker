import { getCompanyNameFromDomainUrl } from '@/companies/utils/getCompanyNameFromDomainUrl';

describe('getCompanyNameFromDomainUrl', () => {
  it('should derive capitalized name from domain urls', () => {
    expect(getCompanyNameFromDomainUrl('https://www.apple.com/path')).toBe(
      'Apple',
    );
    expect(getCompanyNameFromDomainUrl('tinasoft.io')).toBe('Tinasoft');
  });

  it('should return empty for invalid domains', () => {
    expect(getCompanyNameFromDomainUrl('')).toBe('');
    expect(getCompanyNameFromDomainUrl('localhost')).toBe('');
  });
});
