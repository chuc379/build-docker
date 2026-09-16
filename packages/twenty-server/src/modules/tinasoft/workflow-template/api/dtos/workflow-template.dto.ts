import { Field, ObjectType } from '@nestjs/graphql';

import { type WorkflowTemplateRequiredSetting } from 'twenty-shared/workflow';

@ObjectType('WorkflowTemplateRequiredSetting')
export class WorkflowTemplateRequiredSettingDTO {
  @Field(() => String)
  key: string;

  @Field(() => String)
  type: WorkflowTemplateRequiredSetting['type'];

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  defaultValue?: string;
}

@ObjectType('WorkflowTemplate')
export class WorkflowTemplateDTO {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  shortDescription: string;

  @Field(() => String)
  purpose: string;

  @Field(() => String)
  category: string;

  @Field(() => String)
  icon: string;

  @Field(() => [WorkflowTemplateRequiredSettingDTO])
  requiredSettings: WorkflowTemplateRequiredSettingDTO[];
}
