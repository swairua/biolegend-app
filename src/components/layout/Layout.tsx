import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedLogin } from '@/components/auth/EnhancedLogin';
import { supabase } from '@/integrations/supabase/client';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [loadingStartTime] = useState(Date.now());

  // Routes that don't require authentication
  const publicRoutes = ['/auth-test', '/manual-setup', '/database-fix-page', '/auto-fix', '/audit', '/auto-payment-sync', '/payment-sync'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // Detect existing Supabase auth token to allow a grace period on refresh/HMR
  const hasSupabaseToken = useMemo(() => {
    try {
      const projectRef = supabase.supabaseUrl.split('//')[1]?.split('.')[0];
      const key = projectRef ? `sb-${projectRef}-auth-token` : null;
      if (key && localStorage.getItem(key)) return true;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
      }
    } catch {}
    return false;
  }, []);

  const [grace, setGrace] = useState(true);
  useEffect(() => {
    const ms = hasSupabaseToken ? 3500 : 1500;
    const t = setTimeout(() => setGrace(false), ms);
    return () => clearTimeout(t);
  }, [hasSupabaseToken]);

  // Show login only after initial auth/grace completes to avoid logout flash on refresh
  if (!loading && !isAuthenticated && !isPublicRoute && !grace) {
    return <EnhancedLogin />;
  }

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">App appears to be stuck in loading state...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  // Show loading spinner if loading or within grace window
  if (loading || (!isPublicRoute && !isAuthenticated && grace)) {
    const loadingDuration = Math.floor((Date.now() - loadingStartTime) / 1000);

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-2 w-full max-w-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Starting up...</p>
          <p className="text-sm text-muted-foreground">This should only take a moment</p>
          {loadingDuration > 2 && (
            <p className="text-sm text-muted-foreground mt-2">Almost ready...</p>
          )}
        </div>
      </div>
    );
  }

  // Show simple layout for public routes
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  // Show authenticated layout
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
