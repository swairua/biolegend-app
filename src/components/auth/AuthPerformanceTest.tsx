import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export const AuthPerformanceTest = () => {
  const { loading, isAuthenticated, user, profile } = useAuth();
  const [startTime] = useState(Date.now());
  const [authCompletedTime, setAuthCompletedTime] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track when auth completes
  useEffect(() => {
    if (!loading && !authCompletedTime) {
      setAuthCompletedTime(Date.now());
    }
  }, [loading, authCompletedTime]);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getElapsedTime = () => {
    const elapsed = authCompletedTime ? (authCompletedTime - startTime) : (Date.now() - startTime);
    return (elapsed / 1000).toFixed(1);
  };

  const getPerformanceRating = () => {
    const elapsed = parseFloat(getElapsedTime());
    if (loading) return { label: 'Loading...', color: 'bg-blue-500', icon: Clock };
    if (elapsed <= 2) return { label: 'Excellent', color: 'bg-green-500', icon: CheckCircle };
    if (elapsed <= 4) return { label: 'Good', color: 'bg-yellow-500', icon: CheckCircle };
    return { label: 'Slow', color: 'bg-red-500', icon: AlertCircle };
  };

  const performance = getPerformanceRating();
  const PerformanceIcon = performance.icon;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Auth Performance</span>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" title="Online" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" title="Offline" />
            )}
            <Badge className={`${performance.color} text-white`}>
              <PerformanceIcon className="h-3 w-3 mr-1" />
              {performance.label}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Startup Time:</span>
            <div className="font-medium">{getElapsedTime()}s</div>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <div className="font-medium">
              {loading ? (
                <span className="text-blue-600">Loading</span>
              ) : (
                <span className="text-green-600">Ready</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Auth:</span>
            <div className="font-medium">
              {isAuthenticated ? (
                <span className="text-green-600">Authenticated</span>
              ) : (
                <span className="text-gray-600">Not authenticated</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Profile:</span>
            <div className="font-medium">
              {profile ? (
                <span className="text-green-600">Loaded</span>
              ) : (
                <span className="text-gray-600">Not loaded</span>
              )}
            </div>
          </div>
        </div>

        {user && (
          <div className="pt-2 border-t">
            <div className="text-sm text-muted-foreground">User Details:</div>
            <div className="text-sm">
              <div>Email: {user.email}</div>
              {profile?.full_name && <div>Name: {profile.full_name}</div>}
              {profile?.role && <div>Role: {profile.role}</div>}
            </div>
          </div>
        )}

        <div className="pt-2 border-t text-xs text-muted-foreground">
          {loading ? (
            <div>⏳ Authentication in progress...</div>
          ) : authCompletedTime ? (
            <div>✅ Auth completed in {getElapsedTime()}s</div>
          ) : (
            <div>⚡ App ready, auth will complete in background</div>
          )}
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          <div className="space-y-1">
            <div>📊 Performance Targets:</div>
            <div>• Excellent: ≤ 2.0s</div>
            <div>• Good: ≤ 4.0s</div>
            <div>• App should start in ~1s regardless of auth</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
