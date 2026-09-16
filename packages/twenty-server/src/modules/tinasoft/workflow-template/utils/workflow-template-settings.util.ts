import { msg } from '@lingui/core/macro';
import {
  buildWorkflowTemplateSettingsZodSchema,
  type WorkflowTemplateRequiredSetting,
} from 'twenty-shared/workflow';

import { UserInputError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';

export const getStringWorkflowTemplateSetting = ({
  settings,
  key,
}: {
  settings: Record<string, unknown>;
  key: string;
}) => settings[key] as string;

export const getNumberWorkflowTemplateSetting = ({
  settings,
  key,
}: {
  settings: Record<string, unknown>;
  key: string;
}) => settings[key] as number;

export const validateWorkflowTemplateSettings = ({
  requiredSettings,
  settings,
}: {
  requiredSettings: WorkflowTemplateRequiredSetting[];
  settings: Record<string, unknown>;
}): Record<string, unknown> => {
  const schema = buildWorkflowTemplateSettingsZodSchema(requiredSettings);
  const result = schema.safeParse(settings);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => {
      const key = String(issue.path[0] ?? 'unknown');
      const label = requiredSettings.find((s) => s.key === key)?.label ?? key;

      return `${label}: ${issue.message}`;
    });

    throw new UserInputError(fieldErrors.join('; '), {
      isExpected: true,
      userFriendlyMessage: msg`Invalid workflow template settings. Please check the template configuration fields.`,
    });
  }

  return result.data;
};
