import { z } from 'zod';

import {
  ASK_QUESTIONS_TOOL_NAME,
  type AskQuestionsToolInput,
  type AskQuestionsToolResult,
} from 'twenty-shared/ai';

import { unwrapNestedToolArguments } from 'src/engine/metadata-modules/ai/ai-agent/utils/unwrap-nested-tool-arguments.util';

export { ASK_QUESTIONS_TOOL_NAME };

const askQuestionsObjectSchema = z.object({
  questions: z
    .array(
      z
        .object({
          header: z
            .string()
            .describe(
              'Very short label/tag for the question (≤ ~32 chars), e.g. "Email type".',
            ),
          question: z
            .string()
            .describe(
              'The full question to ask the user. Be clear and specific.',
            ),
          options: z
            .array(
              z.object({
                label: z
                  .string()
                  .describe('Concise option the user can pick (1-5 words).'),
                description: z
                  .string()
                  .optional()
                  .describe(
                    'Longer explanation shown when the user opens the option info icon.',
                  ),
                isRecommended: z
                  .boolean()
                  .optional()
                  .describe(
                    'Suggested option(s). Single-select: at most one. Multi-select: mark every recommended choice.',
                  ),
              }),
            )
            .min(2)
            .max(4)
            .describe('2-4 options for the user to choose from.'),
          allowMultiSelect: z
            .boolean()
            .optional()
            .describe('Allow the user to select more than one option.'),
        })
        .refine(
          (question) =>
            question.allowMultiSelect === true ||
            question.options.filter((option) => option.isRecommended === true)
              .length <= 1,
          {
            message:
              'At most one option can be marked as recommended unless allowMultiSelect is true.',
            path: ['options'],
          },
        ),
    )
    .min(1)
    .max(4)
    .describe('One to four questions to ask the user.'),
});

export const askQuestionsInputSchema = z.preprocess(
  unwrapNestedToolArguments,
  askQuestionsObjectSchema,
);

type AskQuestionsPendingOutput = {
  success: true;
  message: string;
  result: AskQuestionsToolResult;
};

const STANDARD_DESCRIPTION =
  'Ask the user one or more multiple-choice questions when you need a decision you cannot ' +
  'infer from the request or context and that has no obvious default. The conversation ' +
  'pauses until the user answers, then continues with their choice in mind. Prefer this ' +
  'over guessing on consequential or ambiguous decisions. Do NOT use it for information you ' +
  'could look up with another tool, or for trivial choices with an obvious default. The ' +
  'user can always type a free-form answer instead of picking an option.';

const WORKSPACE_SETUP_DESCRIPTION =
  'Ask the user one or more multiple-choice questions when a decision is theirs to make. ' +
  'The conversation pauses until the user answers, then continues with their choice in ' +
  'mind. Do NOT use it for information you could look up with another tool. The user can ' +
  'always type a free-form answer instead of picking an option.';

export const createAskQuestionsTool = ({
  isWorkspaceSetupThread,
}: {
  isWorkspaceSetupThread: boolean;
}) => ({
  description: isWorkspaceSetupThread
    ? WORKSPACE_SETUP_DESCRIPTION
    : STANDARD_DESCRIPTION,
  inputSchema: askQuestionsInputSchema,
  execute: async (
    input: AskQuestionsToolInput,
  ): Promise<AskQuestionsPendingOutput> => ({
    success: true,
    message: 'Questions presented to the user; awaiting their answer.',
    result: { questions: input.questions, status: 'pending' },
  }),
});
