import { isNonEmptyString } from '@sniptt/guards';

import { extractDomainFromLink } from 'src/modules/contact-creation-manager/utils/extract-domain-from-link.util';

export const normalizeCompanyDomain = (
  domainOrUrl: string | null | undefined,
): string | null => {
  if (!isNonEmptyString(domainOrUrl)) {
    return null;
  }

  const trimmed = domainOrUrl.trim().toLowerCase();
  const domain = extractDomainFromLink(trimmed);

  if (!isNonEmptyString(domain) || !domain.includes('.')) {
    return null;
  }

  return domain.replace(/\/$/, '');
};
