/**
 * Input validation and sanitization utilities
 */

/**
 * Validates and sanitizes an ID (typically page_id, block_id, etc.)
 * These are expected to be in UUID format with hyphens
 */
export function validateId(id: string): string {
  // Simple regex pattern for UUIDs with hyphens
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid ID: ID must be a non-empty string');
  }
  
  // If ID doesn't match UUID pattern exactly, this is likely an attack or misuse
  if (!pattern.test(id)) {
    throw new Error('Invalid ID format: ID must be in UUID format (8-4-4-4-12 with hyphens)');
  }
  
  return id;
}

/**
 * Validates pagination parameters
 */
export function validatePagination(
  start_cursor?: string,
  page_size?: number
): { start_cursor?: string; page_size?: number } {
  const result: { start_cursor?: string; page_size?: number } = {};
  
  // Validate start_cursor if provided
  if (start_cursor !== undefined) {
    if (typeof start_cursor !== 'string') {
      throw new Error('Invalid start_cursor: must be a string');
    }
    // Sanitize by removing potential control characters
    result.start_cursor = start_cursor.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }
  
  // Validate page_size if provided
  if (page_size !== undefined) {
    if (typeof page_size !== 'number' || page_size <= 0 || page_size > 100) {
      throw new Error('Invalid page_size: must be a number between 1 and 100');
    }
    result.page_size = page_size;
  }
  
  return result;
}

/**
 * Sanitizes a string to prevent potential script injection
 * This is especially important for markdown conversion
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    // Replace script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Replace potentially dangerous HTML attributes
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    // Replace data URIs which could contain executable code
    .replace(/data:[^;]*;base64,[a-z0-9+/=]*$/gi, '');
}

/**
 * Safely converts an object to JSON string
 * Ensures no circular references or other issues
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj, getCircularReplacer(), 2);
  } catch (err) {
    console.error('Failed to stringify object:', err);
    return '{"error": "Failed to stringify object"}';
  }
}

/**
 * Helper function to handle circular references in JSON.stringify
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  };
}
