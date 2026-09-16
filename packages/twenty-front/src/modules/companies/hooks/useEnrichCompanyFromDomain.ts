import { useMutation } from '@apollo/client/react';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { ENRICH_COMPANY_FROM_DOMAIN } from '@/companies/graphql/mutations/enrichCompanyFromDomain';
import { type EnrichCompanyFromDomainResult } from '@/companies/types/CompanyEnrichmentSuggestions';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';

type EnrichCompanyFromDomainMutationData = {
  enrichCompanyFromDomain: EnrichCompanyFromDomainResult;
};

export const useEnrichCompanyFromDomain = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();
  const [enrichCompanyFromDomainMutation, { loading }] = useMutation<
    EnrichCompanyFromDomainMutationData,
    { input: { domain: string; companyId?: string } }
  >(ENRICH_COMPANY_FROM_DOMAIN);

  const enrichCompanyFromDomain = useCallback(
    async ({
      domain,
      companyId,
    }: {
      domain: string;
      companyId?: string;
    }): Promise<EnrichCompanyFromDomainResult | null> => {
      try {
        const result = await enrichCompanyFromDomainMutation({
          variables: {
            input: {
              domain,
              companyId,
            },
          },
        });

        const enrichmentResult = result.data?.enrichCompanyFromDomain;

        if (!isDefined(enrichmentResult)) {
          enqueueErrorSnackBar({
            message: t`Couldn't enrich company from domain.`,
          });

          return null;
        }

        if (
          enrichmentResult.status === 'ERROR' ||
          enrichmentResult.status === 'NOT_FOUND'
        ) {
          enqueueErrorSnackBar({
            message:
              enrichmentResult.message ??
              t`No company information found for this domain.`,
          });

          return null;
        }

        return enrichmentResult;
      } catch (error) {
        const apolloMessage =
          error instanceof Error ? error.message : undefined;

        enqueueErrorSnackBar({
          message: apolloMessage ?? t`Couldn't enrich company from domain.`,
        });

        return null;
      }
    },
    [enrichCompanyFromDomainMutation, enqueueErrorSnackBar, t],
  );

  return {
    enrichCompanyFromDomain,
    loading,
  };
};
