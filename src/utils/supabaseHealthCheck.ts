import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  isHealthy: boolean;
  issues: string[];
  canCreateUsers: boolean;
  rateLimited: boolean;
}

/**
 * Check Supabase health and configuration
 */
export const checkSupabaseHealth = async (): Promise<HealthCheckResult> => {
  const issues: string[] = [];
  let isHealthy = true;
  let canCreateUsers = false;
  let rateLimited = false;

  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      issues.push(`Database connection failed: ${testError.message}`);
      isHealthy = false;
    }

    // Test auth service with a non-destructive call
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        issues.push(`Auth service issue: ${sessionError.message}`);
        isHealthy = false;
      } else {
        canCreateUsers = true;
      }
    } catch (authError) {
      issues.push(`Auth service unavailable: ${authError}`);
      isHealthy = false;
    }

    // Check if we're rate limited by trying a light auth operation
    try {
      const { error: userError } = await supabase.auth.getUser();
      if (userError && userError.message.includes('seconds')) {
        rateLimited = true;
        issues.push('Rate limited by Supabase auth service');
      }
    } catch (rateLimitError) {
      // Ignore - might not be rate limiting
    }

  } catch (error) {
    issues.push(`General connection error: ${error}`);
    isHealthy = false;
  }

  return {
    isHealthy,
    issues,
    canCreateUsers,
    rateLimited
  };
};

/**
 * Wait for rate limiting to clear
 */
export const waitForRateLimit = async (maxWaitTime: number = 30000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const health = await checkSupabaseHealth();
    
    if (!health.rateLimited) {
      return true;
    }
    
    console.log('Still rate limited, waiting...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  }
  
  return false; // Timeout reached
};

/**
 * Smart retry with rate limit handling
 */
export const retryWithRateLimit = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 5000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('seconds');
      const isLastAttempt = attempt === maxRetries;
      
      if (isRateLimit && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error; // Re-throw if not rate limit or last attempt
    }
  }
  
  throw new Error('Max retries exceeded');
};
