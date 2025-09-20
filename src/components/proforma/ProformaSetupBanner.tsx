import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Loader2,
  Database
} from 'lucide-react';
import { checkProformaTables, setupProformaTables, ensureProformaSchema } from '@/utils/proformaDatabaseSetup';
import { toast } from 'sonner';

export function ProformaSetupBanner() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'missing' | 'error' | 'setting-up'>('checking');
  const [setupResult, setSetupResult] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setStatus('checking');
      const result = await checkProformaTables();
      
      if (result.ready) {
        setStatus('ready');
      } else {
        setStatus('missing');
      }
    } catch (error) {
      console.error('Error checking proforma tables:', error);
      setStatus('error');
    }
  };

  const handleSetup = async () => {
    try {
      setStatus('setting-up');
      toast.info('Setting up proforma invoice tables...');
      
      const result = await setupProformaTables();
      setSetupResult(result);

      // Always attempt to harmonize schema
      const harmonize = await ensureProformaSchema();
      if (!harmonize.success) {
        console.warn('Schema harmonization reported an issue:', harmonize.error);
      }

      if (result.success) {
        toast.success('Proforma tables created and schema harmonized!');
        setStatus('ready');
      } else {
        toast.error(`Setup failed: ${result.errors.join(', ')}`);
        setStatus('error');
      }
    } catch (error) {
      console.error('Error setting up proforma tables:', error);
      toast.error('Failed to setup proforma tables');
      setStatus('error');
    }
  };

  if (status === 'ready') {
    return null; // Don't show banner when everything is ready
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'checking':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          title: 'Checking Database Configuration',
          description: 'Verifying proforma invoice tables...',
          variant: 'default' as const,
          showAction: false
        };
      case 'missing':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Database Setup Required',
          description: 'Proforma invoice tables need to be created to use this feature.',
          variant: 'destructive' as const,
          showAction: true,
          actionText: 'Setup Database Tables',
          actionIcon: <Database className="h-4 w-4" />
        };
      case 'setting-up':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          title: 'Setting Up Database',
          description: 'Creating proforma invoice tables...',
          variant: 'default' as const,
          showAction: false
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Setup Error',
          description: setupResult ? 
            `Setup failed: ${setupResult.errors?.join(', ') || 'Unknown error'}` :
            'An error occurred while checking the database configuration.',
          variant: 'destructive' as const,
          showAction: true,
          actionText: 'Retry Setup',
          actionIcon: <Settings className="h-4 w-4" />
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Unknown Status',
          description: 'Unable to determine database status.',
          variant: 'destructive' as const,
          showAction: true,
          actionText: 'Check Again',
          actionIcon: <Settings className="h-4 w-4" />
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className={`border-l-4 ${
      statusInfo.variant === 'destructive' 
        ? 'border-l-destructive bg-destructive/5' 
        : 'border-l-primary bg-primary/5'
    }`}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className={`${
            statusInfo.variant === 'destructive' ? 'text-destructive' : 'text-primary'
          }`}>
            {statusInfo.icon}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{statusInfo.title}</h3>
              <Badge variant={statusInfo.variant === 'destructive' ? 'destructive' : 'secondary'}>
                {status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {statusInfo.description}
            </p>
            {setupResult && setupResult.steps && (
              <div className="text-xs space-y-1">
                {setupResult.steps.map((step: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    {step.success ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                    <span className={step.success ? 'text-success' : 'text-destructive'}>
                      {step.step}
                      {step.error && `: ${step.error}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {statusInfo.showAction && (
              <div className="pt-2">
                <Button
                  onClick={status === 'missing' ? handleSetup : checkStatus}
                  variant={statusInfo.variant === 'destructive' ? 'destructive' : 'default'}
                  size="sm"
                  disabled={status === 'setting-up'}
                >
                  {statusInfo.actionIcon}
                  <span className="ml-2">
                    {status === 'setting-up' ? 'Setting up...' : statusInfo.actionText}
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
