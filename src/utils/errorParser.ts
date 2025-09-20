/**
 * Utility functions for parsing and displaying error messages
 */

export interface ParsedError {
  message: string;
  details?: string;
  code?: string;
  type: 'validation' | 'database' | 'network' | 'permission' | 'unknown';
}

/**
 * Parse any error object and extract a human-readable message
 */
export function parseError(error: any): ParsedError {
  let message = 'An unknown error occurred';
  let details = '';
  let code = '';
  let type: ParsedError['type'] = 'unknown';

  // Log the raw error for debugging
  console.error('Error to parse:', {
    error,
    errorType: typeof error,
    errorConstructor: error?.constructor?.name,
    errorString: String(error),
    errorJSON: JSON.stringify(error, null, 2)
  });

  if (error instanceof Error) {
    message = error.message;
    type = 'unknown';
  } else if (error && typeof error === 'object') {
    // Handle Supabase error objects
    const supabaseError = error as any;
    
    // Extract basic error information
    if (supabaseError.message) {
      message = supabaseError.message;
    } else if (supabaseError.details) {
      message = supabaseError.details;
      details = supabaseError.details;
    } else if (supabaseError.hint) {
      message = supabaseError.hint;
    } else if (supabaseError.code) {
      message = `Error code: ${supabaseError.code}`;
      code = supabaseError.code;
    } else if (supabaseError.statusText) {
      message = supabaseError.statusText;
    } else if (supabaseError.error) {
      // Sometimes the error is nested in an 'error' property
      return parseError(supabaseError.error);
    } else {
      // Try to extract any string value from the error object
      const errorKeys = Object.keys(supabaseError);
      for (const key of errorKeys) {
        if (typeof supabaseError[key] === 'string' && supabaseError[key].length > 0) {
          message = `${key}: ${supabaseError[key]}`;
          break;
        }
      }
      if (message === 'An unknown error occurred') {
        message = JSON.stringify(error);
      }
    }

    // Determine error type based on content
    if (message.includes('does not exist') || message.includes('relation') || message.includes('table')) {
      type = 'database';
    } else if (message.includes('permission denied') || message.includes('insufficient_privilege')) {
      type = 'permission';
    } else if (message.includes('column') && message.includes('does not exist')) {
      type = 'database';
    } else if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) {
      type = 'network';
    } else if (message.includes('validation') || message.includes('constraint') || message.includes('invalid')) {
      type = 'validation';
    }

    // Store additional details
    if (supabaseError.details && supabaseError.details !== message) {
      details = supabaseError.details;
    }
    if (supabaseError.code) {
      code = supabaseError.code;
    }
  } else {
    message = String(error);
  }

  return {
    message,
    details,
    code,
    type
  };
}

/**
 * Get a user-friendly error message with specific handling for common cases
 */
export function getUserFriendlyMessage(error: any, context?: string): string {
  const parsed = parseError(error);
  
  // Handle specific error patterns
  if (parsed.type === 'database') {
    if (parsed.message.includes('companies') && parsed.message.includes('does not exist')) {
      return 'Companies table does not exist. Please run the database setup first.';
    } else if (parsed.message.includes('currency') && parsed.message.includes('column')) {
      return 'Currency column is missing from companies table. Please run the schema fix to add missing columns.';
    } else if (parsed.message.includes('registration_number') || parsed.message.includes('fiscal_year_start')) {
      return 'Database schema is incomplete. Please run the schema fix to add missing columns.';
    } else if (parsed.message.includes('column') && parsed.message.includes('does not exist')) {
      return 'Database schema mismatch detected. Please update your database schema or contact support.';
    }
  } else if (parsed.type === 'permission') {
    return 'Permission denied: Please check your database permissions or contact your administrator.';
  } else if (parsed.type === 'validation') {
    if (parsed.message.includes('null value') && parsed.message.includes('violates not-null constraint')) {
      return 'Required field is missing. Please ensure all required fields are filled.';
    } else if (parsed.message.includes('invalid input syntax')) {
      return 'Invalid data format detected. Please check your input values.';
    } else if (parsed.message.includes('duplicate key') || parsed.message.includes('already exists')) {
      return 'A record with this information already exists.';
    } else if (parsed.message.includes('value too long')) {
      return 'One of your input values is too long. Please shorten your text fields.';
    }
  } else if (parsed.type === 'network') {
    return 'Network or timeout error. Please check your connection and try again.';
  }

  // Add context if provided
  const contextPrefix = context ? `${context}: ` : '';
  return `${contextPrefix}${parsed.message}`;
}

/**
 * Log error details to console with proper formatting
 */
export function logError(error: any, context?: string) {
  const parsed = parseError(error);
  const prefix = context ? `[${context}]` : '[Error]';
  
  console.group(`${prefix} Error Details`);
  console.error('Message:', parsed.message);
  if (parsed.details) console.error('Details:', parsed.details);
  if (parsed.code) console.error('Code:', parsed.code);
  console.error('Type:', parsed.type);
  console.error('Raw Error:', error);
  console.groupEnd();
}
