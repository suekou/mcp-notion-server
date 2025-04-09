/**
 * Utility functions
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Filter tools based on enabledTools parameter
 */
export function filterTools(
  tools: Tool[],
  enabledToolsSet: Set<string> = new Set()
): Tool[] {
  if (enabledToolsSet.size === 0) return tools;
  return tools.filter((tool) => enabledToolsSet.has(tool.name));
}
