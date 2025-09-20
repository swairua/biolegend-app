import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StatusCheck {
  name: string;
  status: 'checking' | 'working' | 'error';
  details?: string;
}

export function PaymentAllocationStatus() {
  const [checks, setChecks] = useState<StatusCheck[]>([
    { name: 'Payment Allocations Table', status: 'checking' },
    { name: 'Database Function', status: 'checking' },
    { name: 'User Profile', status: 'checking' }
  ]);

  const updateCheck = (index: number, updates: Partial<StatusCheck>) => {
    setChecks(prev => prev.map((check, i) => 
      i === index ? { ...check, ...updates } : check
    ));
  };

  useEffect(() => {
    const runStatusChecks = async () => {
      // Check 1: Payment Allocations Table
      try {
        const { error } = await supabase
          .from('payment_allocations')
          .select('id')
          .limit(1);
        
        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            updateCheck(0, { status: 'error', details: 'Table missing' });
          } else {
            updateCheck(0, { status: 'error', details: 'RLS/Permission issue' });
          }
        } else {
          updateCheck(0, { status: 'working', details: 'Table accessible' });
        }
      } catch (err) {
        updateCheck(0, { status: 'error', details: 'Connection failed' });
      }

      // Check 2: Database Function
      try {
        const { error } = await supabase.rpc('record_payment_with_allocation', {
          p_company_id: '00000000-0000-0000-0000-000000000000',
          p_customer_id: '00000000-0000-0000-0000-000000000000',
          p_invoice_id: '00000000-0000-0000-0000-000000000000',
          p_payment_number: 'TEST',
          p_payment_date: '2024-01-01',
          p_amount: 1,
          p_payment_method: 'cash',
          p_reference_number: 'TEST',
          p_notes: 'TEST'
        });

        if (error) {
          if (error.code === 'PGRST202') {
            updateCheck(1, { status: 'error', details: 'Function missing' });
          } else if (error.message.includes('Invoice not found')) {
            updateCheck(1, { status: 'working', details: 'Function available' });
          } else {
            updateCheck(1, { status: 'error', details: 'Function error' });
          }
        } else {
          updateCheck(1, { status: 'working', details: 'Function working' });
        }
      } catch (err) {
        updateCheck(1, { status: 'error', details: 'Function test failed' });
      }

      // Check 3: User Profile
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.company_id) {
            updateCheck(2, { status: 'working', details: 'Profile linked' });
          } else {
            updateCheck(2, { status: 'error', details: 'No company link' });
          }
        } else {
          updateCheck(2, { status: 'error', details: 'Not authenticated' });
        }
      } catch (err) {
        updateCheck(2, { status: 'error', details: 'Profile check failed' });
      }
    };

    runStatusChecks();
  }, []);

  const getStatusIcon = (status: StatusCheck['status']) => {
    switch (status) {
      case 'working':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: StatusCheck['status']) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-success-light text-success">Working</Badge>;
      case 'error':
        return <Badge className="bg-destructive-light text-destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Checking</Badge>;
    }
  };

  const workingCount = checks.filter(check => check.status === 'working').length;
  const errorCount = checks.filter(check => check.status === 'error').length;
  const allWorking = workingCount === checks.length;
  const hasErrors = errorCount > 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-primary" />
          <span>Payment Allocation Status</span>
          {allWorking && (
            <Badge className="bg-success-light text-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Systems Working
            </Badge>
          )}
          {hasErrors && (
            <Badge className="bg-destructive-light text-destructive">
              <XCircle className="h-3 w-3 mr-1" />
              {errorCount} Issue{errorCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="flex-shrink-0">
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{check.name}</h4>
                  {getStatusBadge(check.status)}
                </div>
                {check.details && (
                  <p className="text-xs text-muted-foreground">{check.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {allWorking && (
          <Alert className="border-success/20 bg-success-light">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              <strong>✅ Payment Allocation System Active</strong>
              <br />
              Your manual fixes are working! Payments will be properly allocated to invoices.
            </AlertDescription>
          </Alert>
        )}

        {hasErrors && (
          <Alert className="border-warning/20 bg-warning-light">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              <strong>⚠️ Some Issues Detected</strong>
              <br />
              Payment allocation may not work correctly. Please check the system configuration.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
