const NESTED_TOOL_ARGUMENT_WRAPPER_KEYS = [
  'arguments',
  'input',
  'parameters',
  'args',
] as const;

// Some OpenAI-compatible models (e.g. DeepSeek via OpenRouter) wrap tool
// arguments once more as { arguments: { ...actualFields } }.
export const unwrapNestedToolArguments = (
  value: unknown,
): Record<string, unknown> | unknown => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length !== 1) {
    return value;
  }

  const [onlyKey] = keys;

  if (
    !NESTED_TOOL_ARGUMENT_WRAPPER_KEYS.includes(
      onlyKey as (typeof NESTED_TOOL_ARGUMENT_WRAPPER_KEYS)[number],
    )
  ) {
    return value;
  }

  const nestedValue = record[onlyKey];

  if (
    typeof nestedValue !== 'object' ||
    nestedValue === null ||
    Array.isArray(nestedValue)
  ) {
    return value;
  }

  return nestedValue as Record<string, unknown>;
};
