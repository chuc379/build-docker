import { gql } from '@apollo/client';

export const ENRICH_COMPANY_FROM_DOMAIN = gql`
  mutation EnrichCompanyFromDomain($input: EnrichCompanyFromDomainInput!) {
    enrichCompanyFromDomain(input: $input) {
      domain
      status
      suggestedFields
      fieldSources
      message
    }
  }
`;
