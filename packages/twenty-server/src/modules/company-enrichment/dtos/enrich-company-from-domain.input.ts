import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class EnrichCompanyFromDomainInput {
  @Field(() => String)
  @IsString()
  domain: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
