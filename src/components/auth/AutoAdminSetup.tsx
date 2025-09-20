import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, UserPlus, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { safeAuthOperation, isRateLimited, getRateLimitTimeRemaining, clearAuthTokens } from '@/utils/authHelpers';

const ADMIN_CREDENTIALS = {
  email: 'admin@biolegendscientific.co.ke',
  password: 'Biolegend2024!Admin',
  fullName: 'System Administrator'
};

interface SetupStatus {
  checking: boolean;
  adminExists: boolean;
  canCreateAdmin: boolean;
  creating: boolean;
  error: string | null;
  success: boolean;
  rateLimited: boolean;
  rateLimitRemaining: number;
}

export function AutoAdminSetup() {
  const [status, setStatus] = useState<SetupStatus>({
    checking: false, // Start as false to prevent immediate check
    adminExists: false,
    canCreateAdmin: false,
    creating: false,
    error: null,
    success: false,
    rateLimited: false,
    rateLimitRemaining: 0
  });

  const hasCheckedRef = useRef(false);
  const rateLimitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update rate limit countdown
  const updateRateLimitStatus = () => {
    if (isRateLimited()) {
      const remaining = getRateLimitTimeRemaining();
      setStatus(prev => ({
        ...prev,
        rateLimited: true,
        rateLimitRemaining: remaining
      }));

      if (remaining > 0) {
        rateLimitTimerRef.current = setTimeout(updateRateLimitStatus, 1000);
      } else {
        setStatus(prev => ({
          ...prev,
          rateLimited: false,
          rateLimitRemaining: 0
        }));
      }
    } else {
      setStatus(prev => ({
        ...prev,
        rateLimited: false,
        rateLimitRemaining: 0
      }));
    }
  };

  const checkAdminExists = async () => {
    if (hasCheckedRef.current) {
      console.log('Admin check already performed, skipping');
      return;
    }

    try {
      setStatus(prev => ({ ...prev, checking: true, error: null }));

      // First, test basic database connectivity
      try {
        const { error: dbError } = await supabase.from('profiles').select('count').limit(1).single();
        if (dbError && !dbError.message.includes('PGRST116')) { // PGRST116 is "no rows returned" which is ok
          console.warn('Database connectivity issue:', dbError);
          setStatus(prev => ({
            ...prev,
            checking: false,
            error: 'Database connection issue. Please check your Supabase configuration.',
            canCreateAdmin: false
          }));
          return;
        }
      } catch (dbError) {
        console.warn('Database check failed:', dbError);
        // Continue anyway - the error might be table doesn't exist yet
      }

      // Use safe auth operation to check admin
      const { data, error } = await safeAuthOperation(async () => {
        console.log('Attempting admin sign-in check...');
        
        const signInResult = await supabase.auth.signInWithPassword({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        return signInResult;
      }, 'checkAdminExists');

      if (error) {
        // Handle rate limiting
        if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
          setStatus(prev => ({ 
            ...prev, 
            checking: false,
            rateLimited: true,
            error: error.message
          }));
          updateRateLimitStatus();
          return;
        }

        // Handle token errors
        if (error.message.includes('invalid') && error.message.includes('token')) {
          toast.info('Cleared invalid authentication tokens');
          setStatus(prev => ({ 
            ...prev, 
            checking: false,
            canCreateAdmin: true,
            error: 'Authentication tokens were cleared. Admin check needed.'
          }));
          return;
        }

        // Handle invalid credentials (admin doesn't exist)
        if (error.message.includes('Invalid login credentials')) {
          setStatus(prev => ({ 
            ...prev, 
            checking: false, 
            adminExists: false,
            canCreateAdmin: true,
            error: 'Admin user not found. You can create one.'
          }));
          hasCheckedRef.current = true;
          return;
        }

        throw error;
      }

      // If we get here, admin exists and can sign in
      if (data?.data?.user) {
        console.log('Admin user exists and can sign in');
        
        // Sign out after successful check
        await supabase.auth.signOut();
        
        setStatus(prev => ({ 
          ...prev, 
          checking: false, 
          adminExists: true,
          canCreateAdmin: false,
          success: true
        }));
        
        hasCheckedRef.current = true;
        toast.success('Admin user verified successfully');
        return;
      }

      // Fallback case
      setStatus(prev => ({ 
        ...prev, 
        checking: false,
        canCreateAdmin: true,
        error: 'Unable to verify admin status. You can try creating an admin user.'
      }));

    } catch (error) {
      console.error('Admin check failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setStatus(prev => ({ 
        ...prev, 
        checking: false, 
        error: `Check failed: ${errorMessage}`,
        canCreateAdmin: true
      }));

      // Don't mark as checked if there was an unexpected error
      if (!errorMessage.includes('rate limit')) {
        hasCheckedRef.current = true;
      }
    }
  };

  const createAdmin = async () => {
    try {
      setStatus(prev => ({ ...prev, creating: true, error: null }));

      // Use safe auth operation for admin creation
      const { data, error } = await safeAuthOperation(async () => {
        console.log('Creating admin user...');
        
        const signUpResult = await supabase.auth.signUp({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
          options: {
            data: {
              full_name: ADMIN_CREDENTIALS.fullName,
            }
          }
        });

        return signUpResult;
      }, 'createAdmin');

      if (error) {
        if (error.message.includes('rate limit')) {
          setStatus(prev => ({ 
            ...prev, 
            creating: false,
            rateLimited: true,
            error: error.message
          }));
          updateRateLimitStatus();
          return;
        }
        throw error;
      }

      if (data?.data?.user) {
        console.log('Admin user created successfully');

        // Try to create profile
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.data.user.id,
              email: ADMIN_CREDENTIALS.email,
              full_name: ADMIN_CREDENTIALS.fullName,
              department: 'Administration',
              position: 'System Administrator',
              role: 'admin',
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (profileError) {
            console.warn('Profile creation failed:', profileError);
            if (profileError.message.includes('relation') && profileError.message.includes('does not exist')) {
              toast.warning('Admin user created but profiles table not found. You may need to set up the database schema.');
            }
          }
        } catch (profileError) {
          console.warn('Profile creation failed (table may not exist):', profileError);
        }

        // Sign out after creation
        await supabase.auth.signOut();

        setStatus(prev => ({ 
          ...prev, 
          creating: false, 
          success: true,
          adminExists: true,
          canCreateAdmin: false 
        }));

        toast.success('Admin user created successfully! You can now log in.');
        hasCheckedRef.current = true;
        return;
      }

      // Handle case where user already exists
      if (data?.error?.message?.includes('User already registered')) {
        setStatus(prev => ({ 
          ...prev, 
          creating: false,
          adminExists: true,
          canCreateAdmin: false,
          success: true,
          error: null
        }));
        toast.info('Admin user already exists. You can try logging in.');
        hasCheckedRef.current = true;
        return;
      }

      throw new Error('User creation failed - no user data returned');

    } catch (error) {
      console.error('Admin creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setStatus(prev => ({ 
        ...prev, 
        creating: false, 
        error: `Creation failed: ${errorMessage}` 
      }));
      
      toast.error('Failed to create admin user');
    }
  };

  const clearTokensAndRetry = () => {
    clearAuthTokens();
    hasCheckedRef.current = false;
    setStatus({
      checking: false,
      adminExists: false,
      canCreateAdmin: false,
      creating: false,
      error: null,
      success: false,
      rateLimited: false,
      rateLimitRemaining: 0
    });
    toast.info('Tokens cleared. You can now retry the admin check.');
  };

  // Initialize rate limit status on mount
  useEffect(() => {
    updateRateLimitStatus();
    
    return () => {
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
      }
    };
  }, []);

  // Auto-check removed - users can manually check admin existence if needed

  // Show rate limited state
  if (status.rateLimited && status.rateLimitRemaining > 0) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <Timer className="h-4 w-4" />
        <AlertDescription>
          <strong>Rate Limited</strong><br />
          Please wait {status.rateLimitRemaining} seconds before trying again.
          <br />
          <Button
            variant="outline"
            size="sm"
            onClick={clearTokensAndRetry}
            className="mt-2"
          >
            Clear Tokens & Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (status.checking) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Checking if admin user exists...
        </AlertDescription>
      </Alert>
    );
  }

  if (status.adminExists && status.success && !status.error) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Admin user is ready!</strong> You can log in with:<br />
          <code className="text-sm bg-green-100 px-1 rounded">admin@biolegendscientific.co.ke</code>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Admin Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasCheckedRef.current && !status.error && !status.checking && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Need to set up or verify admin access? Click below to check or create an admin account.
            </p>
            <Button
              onClick={checkAdminExists}
              disabled={status.checking || status.rateLimited}
              variant="outline"
              className="w-full"
            >
              Check Admin User
            </Button>
          </div>
        )}

        {(status.error || status.canCreateAdmin) && (
          <>
            <div className="space-y-3">
              {status.canCreateAdmin && !status.error && (
                <p className="text-sm text-muted-foreground">
                  No admin account found. Create one to get started.
                </p>
              )}

              {status.error && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    There was an issue checking for the admin account:
                  </p>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {status.error}
                      {status.error.includes('token') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearTokensAndRetry}
                          className="ml-2"
                        >
                          Clear Tokens
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                  <p className="text-xs text-muted-foreground">
                    You can still try creating an admin account below.
                  </p>
                </div>
              )}

              <Button
                onClick={createAdmin}
                disabled={status.creating || status.rateLimited}
                className="w-full"
              >
                {status.creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Admin User...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Admin User
                  </>
                )}
              </Button>

              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs font-medium text-muted-foreground mb-1">Default Admin Credentials:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Email:</strong> admin@biolegendscientific.co.ke</p>
                  <p><strong>Password:</strong> Biolegend2024!Admin</p>
                </div>
              </div>
            </div>
          </>
        )}

        {status.success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Success!</strong> Admin user is ready. You can now log in.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
