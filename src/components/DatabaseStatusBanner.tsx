import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function DatabaseStatusBanner() {
  const [status, setStatus] = React.useState<'checking' | 'connected' | 'error'>('checking');
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const { error } = await supabase.from('companies').select('count').limit(1);
      if (error) {
        console.error('Database connection error:', error);
        setStatus('error');
      } else {
        setStatus('connected');
      }
    } catch (err) {
      console.error('Database connection failed:', err);
      setStatus('error');
    }
    setLastChecked(new Date());
  };

  React.useEffect(() => {
    checkConnection();
  }, []);

  if (status === 'connected') {
    return null; // Don't show banner when everything is working
  }

  return (
    <Alert className={status === 'error' ? 'border-destructive' : 'border-amber-500'}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <div className="flex items-center gap-2">
            <span>Database Status:</span>
            <Badge 
              variant={
                status === 'checking' ? 'outline' : 
                status === 'connected' ? 'default' : 
                'destructive'
              }
            >
              {status === 'checking' && 'Checking...'}
              {status === 'connected' && 'Connected'}
              {status === 'error' && 'Connection Error'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={checkConnection} 
            variant="outline" 
            size="sm"
            disabled={status === 'checking'}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${status === 'checking' ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </div>
      {status === 'error' && (
        <AlertDescription className="mt-2">
          Unable to connect to the database. Please check your connection and try again.
        </AlertDescription>
      )}
    </Alert>
  );
}
