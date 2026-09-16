import { z } from 'zod';

export type WorkflowTemplateRequiredSetting = {
  key: string;
  type: 'email' | 'number' | 'text';
  label: string;
  defaultValue?: string;
};

export const buildWorkflowTemplateSettingsZodSchema = (
  requiredSettings: WorkflowTemplateRequiredSetting[],
) => {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const setting of requiredSettings) {
    switch (setting.type) {
      case 'email':
        shape[setting.key] = z.string().trim().email();
        break;
      case 'text':
        shape[setting.key] = z.string().min(1);
        break;
      case 'number':
        shape[setting.key] = z
          .union([z.number(), z.string()])
          .transform((val) => (typeof val === 'string' ? Number(val) : val))
          .pipe(z.number().finite());
        break;
    }
  }

  return z.object(shape);
};
