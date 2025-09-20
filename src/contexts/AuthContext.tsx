import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { initializeAuth, clearAuthTokens, safeAuthOperation } from '@/utils/authHelpers';
import { logError, getUserFriendlyErrorMessage, isErrorType } from '@/utils/errorLogger';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  company_id?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  clearTokens: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Use refs to prevent stale closures and unnecessary re-renders
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const forceCompletedRef = useRef(false);

  // Toast spam prevention
  const lastNetworkErrorToast = useRef<number>(0);
  const lastPermissionErrorToast = useRef<number>(0);
  const lastGeneralErrorToast = useRef<number>(0);
  const TOAST_COOLDOWN = 10000; // 10 seconds between similar error toasts

  // Fetch user profile from database with error handling and retry logic
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, phone, company_id, department, position, role, status, last_login, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to handle 0 results gracefully

      if (error) {
        throw error;
      }

      if (!profileData) {
        return null;
      }


      return profileData;
    } catch (error) {
      // Use proper error logging utilities to prevent [object Object]
      logError('Exception fetching profile:', error, { userId, context: 'fetchProfile' });

      // Handle specific error types using the error type checker
      if (isErrorType(error, 'auth')) {
        console.warn('Profile fetch failed due to expired token - user may need to re-authenticate');
        return null; // Don't show error toast for auth issues
      }

      if (isErrorType(error, 'network')) {
        console.warn('Profile fetch failed due to network issue');

        // Prevent toast spam - only show network error toast every 10 seconds
        const now = Date.now();
        if (now - lastNetworkErrorToast.current > TOAST_COOLDOWN) {
          lastNetworkErrorToast.current = now;
          setTimeout(() => toast.error(
            'Network connection issue while loading profile. Please check your connection.',
            { duration: 5000 }
          ), 0);
        }
        return null;
      }

      if (isErrorType(error, 'permission')) {
        console.warn('Profile fetch failed due to permissions');

        // Prevent toast spam - only show permission error toast every 10 seconds
        const now = Date.now();
        if (now - lastPermissionErrorToast.current > TOAST_COOLDOWN) {
          lastPermissionErrorToast.current = now;
          setTimeout(() => toast.error(
            'Permission error accessing profile. Please sign in again.',
            { duration: 4000 }
          ), 0);
        }
        return null;
      }

      // Show general error message for other cases
      const friendlyMessage = getUserFriendlyErrorMessage(error);

      // Prevent toast spam - only show general error toast every 10 seconds
      const now = Date.now();
      if (now - lastGeneralErrorToast.current > TOAST_COOLDOWN) {
        lastGeneralErrorToast.current = now;
        setTimeout(() => toast.error(
          `Failed to load user profile: ${friendlyMessage}`,
          { duration: 4000 }
        ), 0);
      }

      return null;
    }
  }, []);

  // Update last login timestamp silently
  const updateLastLogin = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      logError('Error updating last login:', error, { userId, context: 'updateLastLogin' });
    }
  }, []);

  // Handle auth state changes with improved error handling
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    if (!mountedRef.current || initializingRef.current) return;

    
    try {
      // Batch state updates to prevent multiple renders
      if (newSession?.user) {
        const userProfile = await fetchProfile(newSession.user.id);
        
        if (mountedRef.current) {
          setSession(newSession);
          setUser(newSession.user);
          setProfile(userProfile);
          
          // Update last login for sign-in events, but don't await to prevent blocking
          if (event === 'SIGNED_IN' && userProfile) {
            updateLastLogin(newSession.user.id).catch(err =>
              logError('Sign-in last login update failed:', err, {
                userId: newSession.user.id,
                context: 'handleAuthStateChange'
              })
            );
          }
        }
      } else {
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
    } catch (error) {
      logError('Error in auth state change:', error, {
        event,
        hasSession: !!newSession,
        context: 'handleAuthStateChange'
      });

      // If we get invalid token errors, clear tokens
      if (isErrorType(error, 'auth')) {
        const errorMessage = getUserFriendlyErrorMessage(error);
        if (errorMessage.includes('Invalid Refresh Token') ||
            errorMessage.includes('Refresh Token Not Found')) {
          clearAuthTokens();
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchProfile, updateLastLogin]);

  // Initialize auth state with ultra-fast approach and background retry
  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    mountedRef.current = true;

    const initializeAuthState = async () => {
      console.log('🚀 Starting fast auth initialization...');

      // Always start the app immediately - don't block on auth
      const startAppImmediately = () => {
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          console.log('🏁 App started immediately (auth will continue in background)');
        }
      };

      // Start app immediately regardless of auth status
      const immediateStartTimer = setTimeout(startAppImmediately, 0);

      try {
        // Very fast auth check with 3-second timeout
        console.log('🔍 Quick auth check (3s timeout)...');

        const quickAuthPromise = new Promise<any>(async (resolve, reject) => {
          try {
            // Quick session check
            const { data: sessionData, error } = await supabase.auth.getSession();

            if (error) {
              console.warn('⚠️ Quick session check error:', error.message);
              resolve({ session: null, error });
              return;
            }

            console.log('✅ Quick session check completed');
            resolve({ session: sessionData.session, error: null });
          } catch (fetchError) {
            console.warn('⚠️ Quick session fetch error:', fetchError);
            resolve({ session: null, error: fetchError });
          }
        });

        // 3-second timeout for quick check
        const quickTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Quick auth timeout after 3000ms')), 3000);
        });

        // Race quick auth against timeout
        const result = await Promise.race([quickAuthPromise, quickTimeoutPromise]);
        const { session: quickSession, error } = result as any;

        if (quickSession?.user && mountedRef.current) {
          console.log('✅ Quick auth success - user authenticated');

          // Clear the immediate start timer since we have auth
          clearTimeout(immediateStartTimer);

          // Set auth state immediately
          setSession(quickSession);
          setUser(quickSession.user);
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;

          // Fetch profile in background
          fetchProfile(quickSession.user.id)
            .then(userProfile => {
              if (mountedRef.current) {
                setProfile(userProfile);
                console.log('✅ Profile loaded in background');

                // Update last login silently
                if (userProfile) {
                  updateLastLogin(quickSession.user.id).catch(err =>
                    logError('Background update last login failed:', err, {
                      userId: quickSession.user.id,
                      context: 'quickAuth'
                    })
                  );
                }
              }
            })
            .catch(profileError => {
              logError('⚠️ Background profile fetch failed:', profileError, {
                userId: quickSession.user.id,
                context: 'backgroundProfileFetch'
              });
            });

          console.log('🎉 Fast auth initialization completed successfully');
          return;
        }

        // If quick auth didn't work, continue with background retry
        console.log('ℹ️ Quick auth did not find session, starting background retry...');

        // Don't block app startup - let immediate timer complete
        // But start background retry for better user experience
        setTimeout(() => {
          if (mountedRef.current && !user) {
            console.log('🔄 Starting background auth retry...');

            // More patient background retry (10 seconds)
            const backgroundAuthCheck = async () => {
              try {
                const bgResult = await initializeAuth();
                const { session: bgSession } = bgResult;

                if (bgSession?.user && mountedRef.current && !user) {
                  console.log('✅ Background auth retry succeeded');
                  setSession(bgSession);
                  setUser(bgSession.user);

                  // Fetch profile
                  const userProfile = await fetchProfile(bgSession.user.id);
                  if (mountedRef.current) {
                    setProfile(userProfile);
                    if (userProfile) {
                      updateLastLogin(bgSession.user.id).catch(err =>
                        logError('Background retry update last login failed:', err, {
                          userId: bgSession.user.id,
                          context: 'backgroundAuthRetry'
                        })
                      );
                    }
                  }
                }
              } catch (bgError) {
                console.warn('⚠️ Background auth retry failed:', bgError);
                // Silent failure - app is already running
              }
            };

            backgroundAuthCheck();
          }
        }, 2000); // Start background retry after 2 seconds

      } catch (error) {
        console.warn('⚠️ Quick auth check failed:', error);

        // Handle specific error types silently
        if (error instanceof Error) {
          if (error.message.includes('Invalid Refresh Token') ||
              error.message.includes('invalid_token')) {
            console.warn('🧹 Clearing invalid tokens (silent)');
            clearAuthTokens();
          }
        }

        // Don't show errors - app will start anyway
      }

      // Ensure we always complete initialization even if immediate timer didn't fire
      setTimeout(() => {
        if (mountedRef.current && !initialized) {
          console.log('🏁 Ensuring auth initialization completes');
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }, 1500);

      // Aggressive fallback - never stay in loading state more than 3 seconds
      setTimeout(() => {
        if (mountedRef.current && loading) {
          console.log('⚡ Aggressive fallback: forcing loading to false after 3s');
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }, 3000);
    };

    initializeAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, updateLastLogin, handleAuthStateChange, user, initialized]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      setLoading(true);
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }, 'signIn');

    if (error) {
      setLoading(false);
      // Return error without showing toast - let the component handle it
      return { error: error as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      // Return error without showing toast - let the component handle it
      return { error: data.error };
    }

    // Immediately update auth state to avoid UI waiting for onAuthStateChange
    try {
      const session = (data as any)?.data?.session;
      const signedInUser = session?.user;
      if (signedInUser) {
        setSession(session);
        setUser(signedInUser);
        // Fetch profile in background
        fetchProfile(signedInUser.id).then(setProfile).catch(() => {});
      }
    } catch {}

    setLoading(false);
    setTimeout(() => toast.success('Signed in successfully'), 0);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      setLoading(true);
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
    }, 'signUp');

    if (error) {
      setLoading(false);
      // Return error without showing toast - let the component handle it
      return { error: error as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      // Return error without showing toast - let the component handle it
      return { error: data.error };
    }

    setTimeout(() => toast.success('Account created successfully'), 0);
    setLoading(false);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting sign out process...');
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        logError('❌ Sign out error:', error, { context: 'signOut' });
        setTimeout(() => toast.error('Error signing out'), 0);
      } else {
        console.log('✅ Supabase sign out successful');

        // Clear state immediately
        setUser(null);
        setProfile(null);
        setSession(null);

        // Clear local storage
        clearAuthTokens();

        setTimeout(() => toast.success('Signed out successfully'), 0);
        console.log('🎉 Sign out complete!');
      }
    } catch (error) {
      logError('❌ Sign out exception:', error, { context: 'signOut' });
      setTimeout(() => toast.error('Error signing out'), 0);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      return await supabase.auth.resetPasswordForEmail(email);
    }, 'resetPassword');

    if (error) {
      // Return error without showing toast - let the component handle it
      return { error: error as AuthError };
    }

    if (data?.error) {
      // Return error without showing toast - let the component handle it
      return { error: data.error };
    }

    setTimeout(() => toast.success('Password reset email sent'), 0);
    return { error: null };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        logError('Error updating profile:', error, { context: 'updateProfile', userId: user.id });
        setTimeout(() => toast.error('Failed to update profile'), 0);
        return { error: new Error(error.message) };
      }

      // Refresh profile data
      await refreshProfile();
      setTimeout(() => toast.success('Profile updated successfully'), 0);
      return { error: null };
    } catch (error) {
      logError('Error updating profile exception:', error, { context: 'updateProfile', userId: user.id });
      setTimeout(() => toast.error('Failed to update profile'), 0);
      return { error: error as Error };
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const userProfile = await fetchProfile(user.id);
    if (userProfile && mountedRef.current) {
      setProfile(userProfile);
    }
  }, [user, fetchProfile]);

  // Add function to manually clear tokens
  const clearTokens = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    setProfile(null);
    setSession(null);
    toast.info('Authentication tokens cleared. Please sign in again.');
  }, []);

  // Compute derived state
  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin';

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading: loading && !forceCompletedRef.current,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated,
    isAdmin,
    refreshProfile,
    clearTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
