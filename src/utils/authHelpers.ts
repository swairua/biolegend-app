import { supabase } from '@/integrations/supabase/client';

/**
 * Clear corrupted auth tokens from localStorage
 */
export const clearAuthTokens = () => {
  try {
    // Get the storage key for this Supabase instance
    const projectRef = supabase.supabaseUrl.split('//')[1].split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    
    // Clear the main auth token
    localStorage.removeItem(storageKey);
    
    // Clear any other potential auth-related keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes(projectRef))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('Cleared corrupted auth key:', key);
    });
    
    console.log('✅ Cleared all auth tokens');
    return true;
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    return false;
  }
};

/**
 * Check if we're currently rate limited
 */
export const isRateLimited = (): boolean => {
  const rateLimitKey = 'supabase_rate_limit';
  const lastRateLimit = localStorage.getItem(rateLimitKey);
  
  if (!lastRateLimit) return false;
  
  const rateLimitTime = parseInt(lastRateLimit, 10);
  const now = Date.now();
  const rateLimitDuration = 60000; // 1 minute
  
  return (now - rateLimitTime) < rateLimitDuration;
};

/**
 * Mark that we've hit a rate limit
 */
export const markRateLimited = () => {
  const rateLimitKey = 'supabase_rate_limit';
  localStorage.setItem(rateLimitKey, Date.now().toString());
};

/**
 * Get time remaining for rate limit in seconds
 */
export const getRateLimitTimeRemaining = (): number => {
  const rateLimitKey = 'supabase_rate_limit';
  const lastRateLimit = localStorage.getItem(rateLimitKey);
  
  if (!lastRateLimit) return 0;
  
  const rateLimitTime = parseInt(lastRateLimit, 10);
  const now = Date.now();
  const rateLimitDuration = 60000; // 1 minute
  const remaining = rateLimitDuration - (now - rateLimitTime);
  
  return Math.max(0, Math.ceil(remaining / 1000));
};

/**
 * Safe auth operation with rate limiting protection
 */
export const safeAuthOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    // Check if we're rate limited
    if (isRateLimited()) {
      const remaining = getRateLimitTimeRemaining();
      const error = new Error(`Rate limited. Please wait ${remaining} seconds before trying again.`);
      return { data: null, error };
    }
    
    const result = await operation();
    return { data: result, error: null };
    
  } catch (error: any) {
    // Check if this is a rate limit error
    if (error?.message?.includes('rate limit') || error?.message?.includes('Rate limit')) {
      markRateLimited();
      const remaining = getRateLimitTimeRemaining();
      const rateLimitError = new Error(`Rate limit reached. Please wait ${remaining} seconds before trying again.`);
      return { data: null, error: rateLimitError };
    }
    
    // Check if this is an invalid token error
    if (error?.message?.includes('Invalid Refresh Token') || 
        error?.message?.includes('Refresh Token Not Found') ||
        error?.message?.includes('invalid_token')) {
      console.warn('Clearing invalid auth tokens');
      clearAuthTokens();
      const tokenError = new Error('Authentication tokens were invalid and have been cleared. Please sign in again.');
      return { data: null, error: tokenError };
    }
    
    return { data: null, error: error as Error };
  }
};

/**
 * Initialize auth with ultra-fast, resilient approach
 */
export const initializeAuth = async () => {
  try {
    console.log('🔑 Ultra-fast auth check...');

    // Very short timeout for background calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second max for background retry

    try {
      // Quick connectivity test first
      const connectivityCheck = new Promise((resolve) => {
        // Simple fetch to test basic connectivity
        fetch(supabase.supabaseUrl + '/rest/v1/', {
          method: 'HEAD',
          signal: controller.signal
        })
          .then(() => resolve(true))
          .catch(() => resolve(false));
      });

      // Don't wait too long for connectivity
      const connectivityTimeout = new Promise((resolve) => {
        setTimeout(() => resolve(false), 2000);
      });

      const hasConnectivity = await Promise.race([connectivityCheck, connectivityTimeout]);

      if (!hasConnectivity) {
        console.warn('🌐 No connectivity to Supabase, skipping auth');
        clearTimeout(timeoutId);
        return { session: null, error: new Error('No connectivity') };
      }

      // Get current session with abort signal
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      clearTimeout(timeoutId);

      // Handle invalid token errors by clearing them
      if (sessionError?.message?.includes('Invalid Refresh Token') ||
          sessionError?.message?.includes('Refresh Token Not Found') ||
          sessionError?.message?.includes('invalid_token')) {
        console.warn('Invalid tokens detected, clearing...');
        clearAuthTokens();
        return { session: null, error: null };
      }

      if (sessionError) {
        console.warn('Session error:', sessionError.message);
        return { session: null, error: sessionError };
      }

      console.log('✅ Ultra-fast auth completed successfully');
      return { session: sessionData.session, error: null };

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (fetchError.name === 'AbortError') {
        console.warn('⏱️ Auth request timed out (background)');
        return { session: null, error: new Error('Auth request timeout') };
      }

      // Handle network errors gracefully
      if (fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('Network request failed') ||
          fetchError.message?.includes('fetch')) {
        console.warn('🌐 Network error during auth (background):', fetchError.message);
        return { session: null, error: new Error('Network connectivity issue') };
      }

      throw fetchError;
    }

  } catch (error: any) {
    console.warn('⚠️ Background auth check failed:', error);
    return { session: null, error: error };
  }
};

/**
 * Delay utility for rate limiting
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
