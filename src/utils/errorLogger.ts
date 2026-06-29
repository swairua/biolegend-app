/**
 * Utility for consistent error logging that prevents [object Object] console messages
 */

export interface ErrorDetails {
  message?: string;
  code?: string | number;
  details?: any;
  hint?: string;
  timestamp?: string;
  context?: Record<string, any>;
}

/**
 * Safely extracts error details from any error object
 */
export const extractErrorDetails = (error: unknown, context?: Record<string, any>): ErrorDetails => {
  const details: ErrorDetails = {
    timestamp: new Date().toISOString(),
    context
  };

  if (error instanceof Error) {
    details.message = error.message;
    if ('code' in error) details.code = (error as any).code;
    if ('details' in error) details.details = (error as any).details;
    if ('hint' in error) details.hint = (error as any).hint;
  } else if (error && typeof error === 'object') {
    details.message = (error as any).message || String(error);
    if ('code' in error) details.code = (error as any).code;
    if ('details' in error) details.details = (error as any).details;
    if ('hint' in error) details.hint = (error as any).hint;
  } else {
    details.message = String(error);
  }

  return details;
};

/**
 * Logs errors with proper formatting to prevent [object Object] issues
 */
export const logError = (label: string, error: unknown, context?: Record<string, any>) => {
  const errorDetails = extractErrorDetails(error, context);
  console.error(label, errorDetails);
};

/**
 * Logs warnings with proper formatting
 */
export const logWarning = (label: string, error: unknown, context?: Record<string, any>) => {
  const errorDetails = extractErrorDetails(error, context);
  console.warn(label, errorDetails);
};

/**
 * Gets a user-friendly error message from any error
 */
export const getUserFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'An unexpected error occurred';
};

/**
 * Checks if an error is a specific type (e.g., auth, network, permission)
 * CRITICAL: auth type is specifically for Supabase auth token errors (refresh token failures),
 * NOT for RLS/query permission errors. RLS errors should be classified as 'permission'.
 */
export const isErrorType = (error: unknown, type: 'auth' | 'network' | 'permission' | 'validation' | 'refreshTokenError'): boolean => {
  const message = getUserFriendlyErrorMessage(error).toLowerCase();
  const errorObj = error && typeof error === 'object' ? (error as any) : null;
  const errorCode = errorObj?.code || '';

  switch (type) {
    case 'refreshTokenError':
      // CRITICAL: Only match explicit refresh token errors from Supabase auth operations
      return message.includes('invalid refresh token') ||
             message.includes('refresh token not found') ||
             message.includes('invalid_token') ||
             message.includes('invalid_grant') ||
             errorCode === 'invalid_token' ||
             errorCode === 'invalid_grant';

    case 'auth':
      // CRITICAL: JWT/auth header errors ONLY - NOT RLS errors
      // Do NOT match 'unauthorized' or generic 'token' (too broad, catches RLS)
      return message.includes('jwt') ||
             message.includes('invalid jwt') ||
             message.includes('malformed jwt') ||
             message.includes('authentication required') ||
             (message.includes('invalid') && message.includes('jwt'));

    case 'network':
      return message.includes('fetch') ||
             message.includes('network') ||
             message.includes('connection') ||
             message.includes('timeout');

    case 'permission':
      // RLS and data-layer permission errors - do NOT clear auth tokens
      return message.includes('permission') ||
             message.includes('row level security') ||
             message.includes('rls') ||
             message.includes('access denied') ||
             message.includes('new row violates row-level security') ||
             errorCode === 'PGRST301' || // RLS policy violation
             errorCode === 'PGRST201';   // Not authenticated (data, not auth token)

    case 'validation':
      return message.includes('validation') ||
             message.includes('required') ||
             message.includes('invalid') ||
             message.includes('constraint');

    default:
      return false;
  }
};
