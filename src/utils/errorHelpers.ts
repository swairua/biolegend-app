/**
 * Safely parse error messages from various error types (Error instances, Supabase errors, etc.)
 * Prevents "[object Object]" rendering and provides meaningful error messages
 */
export function parseErrorMessage(error: any): string {
  try {
    if (!error) return 'Unknown error occurred';

    // Handle standard Error instances
    if (error instanceof Error) {
      return error.message || 'Error instance with no message';
    }

    // Handle string errors
    if (typeof error === 'string') {
      return error;
    }

    // Handle Supabase/PostgrestError objects
    if (error && typeof error === 'object') {
      // Try different properties in order of preference
      if (error.message && typeof error.message === 'string') {
        return error.message;
      }
      if (error.details && typeof error.details === 'string') {
        return error.details;
      }
      if (error.hint && typeof error.hint === 'string') {
        return error.hint;
      }
      if (error.code) {
        const msg = error.message || error.details || 'Unknown database error';
        return `Database error (${error.code}): ${msg}`;
      }

      // Try to extract meaningful information from nested objects
      if (error.error && typeof error.error === 'object') {
        return parseErrorMessage(error.error);
      }

      // Try JSON.stringify for complex objects
      try {
        const jsonStr = JSON.stringify(error);
        if (jsonStr && jsonStr !== '{}' && jsonStr !== 'null') {
          return `Error object: ${jsonStr}`;
        }
      } catch (jsonError) {
        // JSON.stringify failed, continue to other methods
      }

      // Final fallback - use toString but check if it's meaningful
      const stringified = String(error);
      if (stringified && stringified !== '[object Object]' && stringified !== 'null' && stringified !== 'undefined') {
        return stringified;
      }
    }

    return 'Unknown error occurred - unable to extract error message';
  } catch (parseError) {
    console.error('Error parsing error message:', parseError);
    return `Error parsing failed: ${parseError?.message || 'Unknown parsing error'}`;
  }
}

/**
 * Parse error message with specific handling for common database error codes
 */
export function parseErrorMessageWithCodes(error: any, context?: string): string {
  try {
    const baseMessage = parseErrorMessage(error);
    
    // If we have a Supabase error with a code, provide more specific messages
    if (error && typeof error === 'object' && error.code) {
      switch (error.code) {
        case '23505':
          return `Duplicate entry: ${context ? `${context} already exists` : 'This record already exists'}`;
        case '23503':
          return `Invalid reference: ${context ? `Invalid ${context} reference` : 'Referenced record not found'}`;
        case '23514':
          return `Invalid data: ${context ? `Invalid ${context} data` : 'Data validation failed'}`;
        case '42703':
          return 'Database schema error: Missing column. Please contact support.';
        case '42P01':
          return 'Database schema error: Missing table. Please contact support.';
        case 'PGRST116':
          return 'No data found for the specified criteria.';
        default:
          return baseMessage;
      }
    }
    
    return baseMessage;
  } catch (parseError) {
    console.error('Error parsing error message with codes:', parseError);
    return parseErrorMessage(error);
  }
}
