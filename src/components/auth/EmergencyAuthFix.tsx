import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Shield,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export function EmergencyAuthFix() {
  const clearAllAuthData = () => {
    try {
      // Clear all localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') || 
          key.includes('auth') || 
          key.includes('sb-') ||
          key.includes('token')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('Cleared:', key);
      });

      // Clear sessionStorage too
      sessionStorage.clear();

      // Clear any potential cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });

      toast.success('All authentication data cleared successfully');
      
      // Force reload after a delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing auth data:', error);
      toast.error('Failed to clear auth data');
    }
  };

  const forceRefresh = () => {
    window.location.reload();
  };

  const openInIncognito = () => {
    toast.info('Please copy the URL and open it in an incognito/private browsing window');
  };

  const disableExtensions = () => {
    toast.info('Try disabling browser extensions that might block requests (ad blockers, privacy extensions, etc.)');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span>Authentication Issues</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-destructive/20 bg-destructive-light">
          <Shield className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <strong>Authentication is failing to initialize.</strong>
            <br />
            This is usually caused by network issues, browser extensions, or corrupted authentication tokens.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium">Try these solutions in order:</h4>
          
          <div className="space-y-2">
            <Button 
              onClick={clearAllAuthData}
              variant="outline"
              className="w-full flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>1. Clear All Auth Data & Reload</span>
            </Button>
            
            <Button 
              onClick={forceRefresh}
              variant="outline"
              className="w-full flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>2. Force Page Refresh</span>
            </Button>
            
            <Button 
              onClick={openInIncognito}
              variant="outline"
              className="w-full flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>3. Try Incognito Mode</span>
            </Button>
            
            <Button 
              onClick={disableExtensions}
              variant="outline"
              className="w-full flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>4. Disable Browser Extensions</span>
            </Button>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Still having issues?</strong> The app may be experiencing connectivity problems. 
            Check your internet connection and try again in a few minutes.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
