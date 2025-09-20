import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Loader2, Zap, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { setupPaymentSync, testPaymentSync } from '@/utils/setupPaymentSync';
import { ManualPaymentSyncSetup } from './ManualPaymentSyncSetup';

interface AutoPaymentSyncProps {
  autoStart?: boolean;
}

export function AutoPaymentSync({ autoStart = true }: AutoPaymentSyncProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupDetails, setSetupDetails] = useState<any>(null);

  useEffect(() => {
    if (autoStart) {
      handleAutoSetup();
    }
  }, [autoStart]);

  const handleAutoSetup = async () => {
    setIsRunning(true);
    setError(null);
    setSetupDetails(null);

    try {
      // First test if already set up
      console.log('Checking payment sync status...');
      const testResult = await testPaymentSync();
      
      if (testResult.isSetup) {
        console.log('Payment sync already configured');
        setSetupComplete(true);
        setSetupDetails({
          alreadySetup: true,
          message: testResult.message
        });
        toast.success('Payment sync system is already configured!');
        return;
      }

      // Run the setup
      console.log('Setting up payment sync system...');
      const result = await setupPaymentSync();

      if (result.success) {
        setSetupComplete(true);
        setSetupDetails(result.details);
        toast.success(result.message);
        
        // Show success details in console
        console.log('✅ Payment Sync Setup Complete:');
        console.log('- Database function created');
        console.log('- Payment recording will now automatically update invoice balances');
        console.log('- Payment allocations will be created for proper tracking');
        console.log('- Invoice status will update based on payments');
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error('Auto payment sync setup failed:', err);
      setError(err.message || 'Failed to set up payment synchronization');
      toast.error('Payment sync setup failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  if (isRunning) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Setting Up Payment Auto-Sync
          </CardTitle>
          <CardDescription>
            Configuring automatic payment-invoice synchronization...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating database function for payment recording</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Setting up payment allocation system</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Configuring invoice balance updates</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (setupComplete) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Payment Auto-Sync Complete
            <Badge variant="secondary" className="ml-2">
              <Zap className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </CardTitle>
          <CardDescription>
            Payment-invoice synchronization has been successfully configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                What's Now Working:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Payments automatically update invoice balances</li>
                <li>Payment allocations link payments to invoices</li>
                <li>Invoice status updates (draft → partial → paid)</li>
                <li>Real-time balance calculations</li>
                <li>Consistent data across all views</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">System Status:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-success" />
                  <span>Database function: Active</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-success" />
                  <span>Payment recording: Enhanced</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-success" />
                  <span>Invoice sync: Enabled</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-success" />
                  <span>Balance updates: Real-time</span>
                </div>
              </div>
            </div>
          </div>

          {setupDetails?.alreadySetup && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                The payment sync system was already configured and working properly.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <strong>Ready to use:</strong> Record a payment on any invoice to see the automatic balance updates in action.
              Invoice lists and PDFs will now show current payment status immediately.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Check if error is specifically about function not found
    if (error.includes('function') && error.includes('not found')) {
      return <ManualPaymentSyncSetup />;
    }

    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Payment Auto-Sync Setup Failed
          </CardTitle>
          <CardDescription>
            There was an issue setting up the payment synchronization system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Manual Setup Required:</h4>
            <p className="text-sm text-muted-foreground">
              You may need to run the database setup manually. Check the console for detailed error information
              or contact your database administrator to create the required functions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
