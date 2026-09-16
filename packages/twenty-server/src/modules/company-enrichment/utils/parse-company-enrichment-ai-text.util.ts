import { isNonEmptyString } from '@sniptt/guards';

import {
  companyEnrichmentAiSchema,
  type CompanyEnrichmentAiOutput,
} from 'src/modules/company-enrichment/constants/company-enrichment-ai-schema.const';

const extractJsonObject = (text: string): unknown => {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim());
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in model response.');
  }

  return JSON.parse(text.slice(firstBrace, lastBrace + 1));
};

export const parseCompanyEnrichmentAiText = (
  text: string,
): CompanyEnrichmentAiOutput => {
  if (!isNonEmptyString(text)) {
    throw new Error('Empty model response.');
  }

  const parsed = extractJsonObject(text);
  const result = companyEnrichmentAiSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Model JSON did not match enrichment schema: ${result.error.message}`,
    );
  }

  return result.data;
};
