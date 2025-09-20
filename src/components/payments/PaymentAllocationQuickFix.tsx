import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Copy,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentAllocationQuickFixProps {
  className?: string;
  variant?: 'button' | 'alert';
}

export function PaymentAllocationQuickFix({ 
  className = '', 
  variant = 'alert' 
}: PaymentAllocationQuickFixProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'unknown' | 'working' | 'needs-fix'>('unknown');

  const runQuickCheck = async () => {
    setIsChecking(true);
    try {
      // Quick check: try to access payment_allocations table
      const { error } = await supabase
        .from('payment_allocations')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          setStatus('needs-fix');
          toast.error('Payment allocations table missing - setup required');
        } else {
          setStatus('needs-fix');
          toast.error('Payment allocation system needs configuration');
        }
      } else {
        setStatus('working');
        toast.success('Payment allocation system is working correctly');
      }
    } catch (err: any) {
      setStatus('needs-fix');
      toast.error('Unable to check payment allocation system');
    } finally {
      setIsChecking(false);
    }
  };

  const copyTableSQL = () => {
    const sql = `-- Quick fix: Create payment_allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Enable RLS
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy
CREATE POLICY IF NOT EXISTS "Users can manage allocations in their company" ON payment_allocations 
FOR ALL USING (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);`;

    navigator.clipboard.writeText(sql);
    toast.success('Setup SQL copied! Paste and run in Supabase SQL Editor.');
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/_/sql', '_blank');
  };

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={runQuickCheck}
        disabled={isChecking}
        className={className}
      >
        {isChecking ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4 mr-2" />
        )}
        {isChecking ? 'Checking...' : 'Check Allocation System'}
      </Button>
    );
  }

  return (
    <Alert className={`border-warning/20 bg-warning-light ${className}`}>
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <strong className="text-warning">Payment Allocation Failed</strong>
            <p className="text-sm text-warning mt-1">
              Payment was recorded but couldn't be allocated to the invoice. This usually means 
              the payment_allocations table needs to be set up.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runQuickCheck}
              disabled={isChecking}
              className="bg-background"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              {isChecking ? 'Checking...' : 'Diagnose'}
            </Button>

            {status === 'needs-fix' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyTableSQL}
                  className="bg-background"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Fix SQL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openSupabaseSQL}
                  className="bg-background"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open SQL Editor
                </Button>
              </>
            )}

            {status === 'working' && (
              <Badge className="bg-success-light text-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                System Working
              </Badge>
            )}
          </div>

          {status === 'needs-fix' && (
            <div className="text-xs text-warning">
              <strong>Quick Fix:</strong> Copy the SQL → Open Supabase SQL Editor → Paste & Run → Try payment again
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
