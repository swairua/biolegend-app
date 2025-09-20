import { useEffect } from 'react';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PaymentSynchronization } from '@/components/PaymentSynchronization';

export default function PaymentSynchronizationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set page title
    document.title = 'Payment Synchronization - Biolegend Scientific';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <BiolegendLogo size="lg" showText={false} />
          <h1 className="text-3xl font-bold mt-4 biolegend-brand flex items-center justify-center gap-2">
            <RefreshCw className="h-8 w-8 text-primary" />
            Biolegend Scientific Ltd
          </h1>
          <p className="text-muted-foreground mt-2">Payment-Invoice Synchronization</p>
          <p className="text-sm text-muted-foreground mt-1">
            Synchronize existing payments with invoices and update balances
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Application
          </Button>
        </div>

        {/* Payment Synchronization Component */}
        <PaymentSynchronization />

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-medium">How Payment Synchronization Works:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-card p-4 rounded-lg border">
              <h4 className="font-medium text-foreground mb-2">1. Analysis</h4>
              <p>Scans payments and identifies those without proper allocations</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <h4 className="font-medium text-foreground mb-2">2. Matching</h4>
              <p>Intelligently matches payments to invoices based on customer, date, and amount</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <h4 className="font-medium text-foreground mb-2">3. Synchronization</h4>
              <p>Creates allocations and updates invoice balances automatically</p>
            </div>
          </div>
          <p className="mt-4 text-xs">
            This process ensures all payments are properly linked to invoices with accurate balance calculations.
          </p>
        </div>
      </div>
    </div>
  );
}
