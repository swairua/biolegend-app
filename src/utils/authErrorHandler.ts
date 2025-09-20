import { AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface AuthErrorInfo {
  type: 'invalid_credentials' | 'email_not_confirmed' | 'network_error' | 'rate_limit' | 'server_error' | 'unknown';
  message: string;
  action?: string;
  retry?: boolean;
}

export function analyzeAuthError(error: AuthError | Error): AuthErrorInfo {
  // Safely extract error message with fallback
  let errorMessage = '';

  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
    } else if ('error_description' in error && typeof (error as any).error_description === 'string') {
      errorMessage = (error as any).error_description;
    } else if ('details' in error && typeof (error as any).details === 'string') {
      errorMessage = (error as any).details;
    } else {
      errorMessage = 'An authentication error occurred';
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = 'An unexpected authentication error occurred';
  }

  const message = errorMessage.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return {
      type: 'invalid_credentials',
      message: 'Invalid email or password',
      action: 'Check your credentials or create an admin account using the setup above'
    };
  }

  if (message.includes('email not confirmed')) {
    return {
      type: 'email_not_confirmed',
      message: 'Email address needs to be confirmed',
      action: 'Check your email for a confirmation link'
    };
  }

  if (message.includes('network') || message.includes('fetch')) {
    return {
      type: 'network_error',
      message: 'Network connection error',
      action: 'Check your internet connection and try again',
      retry: true
    };
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return {
      type: 'rate_limit',
      message: 'Too many login attempts',
      action: 'Please wait a few minutes before trying again',
      retry: true
    };
  }

  if (message.includes('server') || message.includes('500')) {
    return {
      type: 'server_error',
      message: 'Server error occurred',
      action: 'Please try again in a few moments',
      retry: true
    };
  }

  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred',
    action: 'Please try again or contact support if the problem persists',
    retry: true
  };
}

export function handleAuthError(error: AuthError | Error): AuthErrorInfo {
  const errorInfo = analyzeAuthError(error);
  
  // Log for debugging
  console.error('Authentication error:', {
    type: errorInfo.type,
    message: errorInfo.message,
    originalError: error
  });

  // Show appropriate toast
  if (errorInfo.retry) {
    toast.error(errorInfo.message, {
      description: errorInfo.action,
      duration: 5000
    });
  } else {
    toast.error(errorInfo.message, {
      description: errorInfo.action,
      duration: 8000
    });
  }

  return errorInfo;
}

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: 'admin@biolegendscientific.co.ke',
  password: 'Biolegend2024!Admin'
};

export function getAdminCredentialsHelp(): string {
  return `Default admin credentials:\nEmail: ${DEFAULT_ADMIN_CREDENTIALS.email}\nPassword: ${DEFAULT_ADMIN_CREDENTIALS.password}`;
}
