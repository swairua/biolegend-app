import { parseErrorMessage } from './errorHelpers';
import { toast } from 'sonner';

/**
 * Safely display error in toast with proper message extraction
 */
export function displayError(error: any, defaultMessage?: string) {
  const message = parseErrorMessage(error);
  const finalMessage = defaultMessage ? `${defaultMessage}: ${message}` : message;
  toast.error(finalMessage);
  console.error('Error details:', error);
}

/**
 * Display success message with optional details
 */
export function displaySuccess(message: string, details?: string) {
  if (details) {
    toast.success(message, { description: details });
  } else {
    toast.success(message);
  }
}

/**
 * Display warning message with optional details
 */
export function displayWarning(message: string, details?: string) {
  if (details) {
    toast.warning(message, { description: details });
  } else {
    toast.warning(message);
  }
}

/**
 * Safely format error for display in components (prevents [object Object])
 */
export function formatErrorForDisplay(error: any): string {
  return parseErrorMessage(error);
}

/**
 * Create a standardized error result object
 */
export function createErrorResult(error: any, context?: string): { success: false; error: string } {
  const message = parseErrorMessage(error);
  return {
    success: false,
    error: context ? `${context}: ${message}` : message
  };
}

/**
 * Create a standardized success result object
 */
export function createSuccessResult(data?: any): { success: true; data?: any } {
  return {
    success: true,
    ...(data && { data })
  };
}
