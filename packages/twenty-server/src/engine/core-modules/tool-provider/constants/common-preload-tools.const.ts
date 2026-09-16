import { OUTPUT_NAVIGATION_TOOL_NAMES } from 'src/engine/core-modules/tool/tools/output-navigation-tool/constants/output-navigation-tool-names.constant';

// Output-navigation tools must stay preloaded: spilled tool results tell the
// model to call them directly, and NoSuchToolError aborts the whole stream.
export const COMMON_PRELOAD_TOOLS: string[] = [
  'search_help_center',
  ...OUTPUT_NAVIGATION_TOOL_NAMES,
];
