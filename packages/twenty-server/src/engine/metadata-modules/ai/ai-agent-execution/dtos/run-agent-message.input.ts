import { Field, InputType } from '@nestjs/graphql';

import { IsEnum } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { type RunAgentMessage } from 'twenty-shared/application';

import { RunAgentMessageRole } from 'src/engine/metadata-modules/ai/ai-agent-execution/enums/run-agent-message-role.enum';

@InputType('RunAgentMessageInput')
export class RunAgentMessageInputDTO implements RunAgentMessage {
  @IsEnum(RunAgentMessageRole)
  @Field(() => RunAgentMessageRole)
  role: RunAgentMessageRole;

  @Field(() => GraphQLJSON)
  content: RunAgentMessage['content'];
}
