import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  fallback,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Detect if a Supabase auth token exists in localStorage (likely already signed in)
  const hasSupabaseToken = useMemo(() => {
    try {
      const projectRef = supabase.supabaseUrl.split('//')[1]?.split('.')[0];
      const key = projectRef ? `sb-${projectRef}-auth-token` : null;
      if (key) return !!localStorage.getItem(key);
      // Fallback: scan for any sb-*-auth-token key
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const [grace, setGrace] = useState(true);

  useEffect(() => {
    // Extend grace period if we detect a stored session token (allow time to restore session)
    const ms = hasSupabaseToken ? 3500 : 1500;
    const t = setTimeout(() => setGrace(false), ms);
    return () => clearTimeout(t);
  }, [hasSupabaseToken]);

  // Show loading while initializing or during grace period to allow session restore
  if (loading || (requireAuth && !isAuthenticated && grace)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication - redirect to login if not authenticated
  if (requireAuth && !isAuthenticated) {
    // Redirect to login page
    useEffect(() => {
      navigate('/login', { replace: true });
    }, [navigate]);

    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component for protecting routes
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  protection: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...protection}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
