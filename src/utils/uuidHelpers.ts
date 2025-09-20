/**
 * UUID validation utilities to prevent "invalid input syntax for uuid" errors
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a value is a valid UUID string
 */
export function isValidUUID(value: any): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Filter array to only include valid UUIDs, removing null, undefined, empty strings
 */
export function filterValidUUIDs(ids: any[]): string[] {
  return ids.filter(id => isValidUUID(id));
}

/**
 * Safely get UUID or null (never empty string)
 */
export function safeUUID(value: any): string | null {
  return isValidUUID(value) ? value : null;
}

/**
 * Validate UUID field and throw user-friendly error if invalid
 */
export function validateRequiredUUID(value: any, fieldName: string): string {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid ${fieldName}. Please refresh and try again.`);
  }
  return value;
}

/**
 * Validate optional UUID field (can be null but not empty string or invalid format)
 */
export function validateOptionalUUID(value: any, fieldName: string): string | null {
  if (value === null || value === undefined) return null;
  if (!isValidUUID(value)) {
    throw new Error(`Invalid ${fieldName}. Please refresh and try again.`);
  }
  return value;
}
