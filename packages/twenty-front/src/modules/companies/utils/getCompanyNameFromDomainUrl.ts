import { capitalize } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';

// Lightweight client-side mirror of server getCompanyNameFromDomainName (no psl)
export const getCompanyNameFromDomainUrl = (
  domainOrUrl: string | null | undefined,
): string => {
  if (!isNonEmptyString(domainOrUrl)) {
    return '';
  }

  let host = domainOrUrl.trim().toLowerCase();
  host = host.replace(/^(https?:\/\/)?/i, '');
  host = host.split('/')[0] ?? '';
  host = host.replace(/^www\./i, '');

  const labels = host.split('.').filter(isNonEmptyString);

  if (labels.length < 2) {
    return '';
  }

  const sld = labels[labels.length - 2];

  return capitalize(sld);
};
