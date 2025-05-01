/**
 * Utility functions
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { 
  validateId, 
  validatePagination, 
  sanitizeString, 
  safeStringify 
} from "./validation.js";

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

/**
 * Validation and sanitization utilities
 */
export {
  validateId,
  validatePagination,
  sanitizeString,
  safeStringify
};
