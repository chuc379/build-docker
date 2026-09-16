import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateWorkflowFromTemplateInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}
