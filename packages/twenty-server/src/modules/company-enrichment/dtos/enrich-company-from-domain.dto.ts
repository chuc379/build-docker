import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import {
  type CompanyEnrichmentFieldSource,
  type CompanyEnrichmentStatus,
  type CompanyEnrichmentSuggestedFields,
} from 'src/modules/company-enrichment/types/company-enrichment-suggestions.type';

export enum EnrichCompanyFromDomainStatus {
  MATCHED = 'MATCHED',
  PARTIAL = 'PARTIAL',
  NOT_FOUND = 'NOT_FOUND',
  ERROR = 'ERROR',
}

registerEnumType(EnrichCompanyFromDomainStatus, {
  name: 'EnrichCompanyFromDomainStatus',
});

@ObjectType('EnrichCompanyFromDomainResult')
export class EnrichCompanyFromDomainDTO {
  @Field(() => String)
  domain: string;

  @Field(() => EnrichCompanyFromDomainStatus)
  status: CompanyEnrichmentStatus;

  @Field(() => GraphQLJSON, { nullable: true })
  suggestedFields: CompanyEnrichmentSuggestedFields | null;

  @Field(() => GraphQLJSON, { nullable: true })
  fieldSources: CompanyEnrichmentFieldSource[] | null;

  @Field(() => String, { nullable: true })
  message: string | null;
}
