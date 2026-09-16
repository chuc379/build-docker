import {
  type LanguageModel,
  type LanguageModelUsage,
  NoSuchToolError,
  Output,
  type StepResult,
  type ToolSet,
  generateText,
} from 'ai';
import { isDefined } from 'twenty-shared/utils';
import { type z } from 'zod';

import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { unwrapNestedToolArguments } from 'src/engine/metadata-modules/ai/ai-agent/utils/unwrap-nested-tool-arguments.util';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { extractCacheCreationTokensFromSteps } from 'src/engine/metadata-modules/ai/ai-billing/utils/extract-cache-creation-tokens.util';
import { buildAiTelemetry } from 'src/engine/metadata-modules/ai/ai-models/utils/build-ai-telemetry.util';

type ToolCall = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  input: string;
};

type RepairToolCallBillingContext = {
  aiBillingService: AiBillingService;
  modelId: string;
  workspaceId: string;
  userWorkspaceId: string | null;
  operationType: UsageOperationType;
};

const parseToolCallInput = (input: string): Record<string, unknown> => {
  try {
    const parsedInput = JSON.parse(input);

    if (
      typeof parsedInput === 'object' &&
      parsedInput !== null &&
      !Array.isArray(parsedInput)
    ) {
      return parsedInput as Record<string, unknown>;
    }
  } catch {
    // Model sometimes emits non-JSON tool input; fall back to empty args.
  }

  return {};
};

const tryUnwrapInvalidToolInput = ({
  toolCall,
}: {
  toolCall: ToolCall;
  error: Error;
}): ToolCall | null => {
  const parsedInput = parseToolCallInput(toolCall.input);
  const unwrappedInput = unwrapNestedToolArguments(parsedInput);

  if (
    unwrappedInput === parsedInput ||
    typeof unwrappedInput !== 'object' ||
    unwrappedInput === null ||
    Array.isArray(unwrappedInput)
  ) {
    return null;
  }

  return {
    type: 'tool-call',
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    input: JSON.stringify(unwrappedInput),
  };
};

export const repairToolCall = async ({
  toolCall,
  tools,
  inputSchema,
  error,
  model,
  billingContext,
}: {
  toolCall: ToolCall;
  tools: Record<string, unknown>;
  inputSchema: (toolCall: { toolName: string }) => unknown;
  error: Error;
  model: LanguageModel;
  billingContext?: RepairToolCallBillingContext;
}): Promise<ToolCall | null> => {
  // Remap unknown direct tool calls through execute_tool when available so the
  // stream can continue instead of aborting on NoSuchToolError.
  if (NoSuchToolError.isInstance(error)) {
    if (toolCall.toolName !== 'execute_tool' && isDefined(tools.execute_tool)) {
      return {
        type: 'tool-call',
        toolCallId: toolCall.toolCallId,
        toolName: 'execute_tool',
        input: JSON.stringify({
          toolName: toolCall.toolName,
          arguments: parseToolCallInput(toolCall.input),
        }),
      };
    }

    return null;
  }

  const unwrappedToolCall = tryUnwrapInvalidToolInput({ toolCall, error });

  if (isDefined(unwrappedToolCall)) {
    return unwrappedToolCall;
  }

  const tool = tools[toolCall.toolName];

  if (!tool || typeof tool !== 'object' || !('inputSchema' in tool)) {
    return null;
  }

  const schema = inputSchema(toolCall);

  if (!schema || typeof schema !== 'object') {
    return null;
  }

  let usage: LanguageModelUsage | undefined;
  let steps: StepResult<ToolSet>[] | undefined;

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: schema as z.ZodTypeAny }),
      prompt: [
        `The AI model attempted to call the tool "${toolCall.toolName}" with invalid input.`,
        ``,
        `Input provided:`,
        JSON.stringify(toolCall.input, null, 2),
        ``,
        `Error encountered:`,
        error.message,
        ``,
        `Please fix the input to exactly match the required schema.`,
        `Pay special attention to:`,
        `- Enum values must match exactly (e.g., "DescNullsLast" not "desc")`,
        `- Object structures must match the schema shape`,
        `- Array items must follow the specified format`,
      ].join('\n'),
      experimental_telemetry: buildAiTelemetry({
        functionId: 'repair-tool-call',
        workspaceId: billingContext?.workspaceId,
        userWorkspaceId: billingContext?.userWorkspaceId,
      }),
    });

    usage = result.usage;
    steps = result.steps;

    const repairedInput = result.output;

    if (repairedInput == null) {
      return null;
    }

    return {
      type: 'tool-call',
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      input: JSON.stringify(repairedInput),
    };
  } catch {
    return null;
  } finally {
    if (billingContext && usage) {
      const cacheCreationTokens = steps
        ? extractCacheCreationTokensFromSteps(steps)
        : 0;

      void billingContext.aiBillingService.calculateAndBillUsage(
        billingContext.modelId,
        { usage, cacheCreationTokens },
        billingContext.workspaceId,
        billingContext.operationType,
        null,
        billingContext.userWorkspaceId,
      );
    }
  }
};
