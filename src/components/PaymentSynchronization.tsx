import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  DollarSign,
  FileText,
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
  analyzePaymentSyncStatus,
  synchronizePayments,
  recalculateAllInvoiceBalances,
  PaymentSyncAnalysis,
  SyncResult
} from '@/utils/paymentSynchronization';
import { PaymentAllocationsTableSetup } from './PaymentAllocationsTableSetup';

export function PaymentSynchronization() {
  const [analysis, setAnalysis] = useState<PaymentSyncAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzePaymentSyncStatus();
      setAnalysis(result);
      
      // Auto-select high confidence matches
      const highConfidenceIndexes = result.potentialMatches
        .map((match, index) => match.confidence === 'high' ? index : -1)
        .filter(index => index !== -1);
      
      setSelectedMatches(new Set(highConfidenceIndexes));
      
      toast.success('Analysis completed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze payment status');
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSync = async () => {
    if (!analysis || selectedMatches.size === 0) {
      toast.error('Please select matches to synchronize');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const matchesToSync = Array.from(selectedMatches).map(index => analysis.potentialMatches[index]);
      const result = await synchronizePayments(matchesToSync);
      setSyncResult(result);
      
      if (result.success) {
        toast.success(`Synchronized ${result.allocationsCreated} payments and updated ${result.invoicesUpdated} invoices`);
        // Refresh analysis
        await runAnalysis();
        setSelectedMatches(new Set());
      } else {
        toast.error('Synchronization completed with errors');
      }
    } catch (err: any) {
      setError(err.message || 'Synchronization failed');
      toast.error('Synchronization failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRecalculateAll = async () => {
    setIsSyncing(true);
    
    try {
      const result = await recalculateAllInvoiceBalances();
      toast.success(`Recalculated ${result.updated} invoice balances`);
      
      if (result.errors.length > 0) {
        console.error('Recalculation errors:', result.errors);
      }
      
      // Refresh analysis
      await runAnalysis();
    } catch (err: any) {
      toast.error('Failed to recalculate invoice balances');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default" className="bg-success text-success-foreground">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-muted-foreground">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing Payment Status
          </CardTitle>
          <CardDescription>
            Scanning payments and invoices to identify synchronization opportunities...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Check if error is specifically about payment_allocations table missing
    if (error.includes('payment_allocations') && (error.includes('relationship') || error.includes('relation'))) {
      return (
        <div className="space-y-6">
          <PaymentAllocationsTableSetup />
          <Card>
            <CardContent className="pt-6">
              <Button onClick={runAnalysis} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Analysis After Table Creation
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Analysis Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={runAnalysis} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Payment Synchronization Analysis
          </CardTitle>
          <CardDescription>
            Current status of payment allocations and invoice balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total Payments</span>
              </div>
              <div className="text-2xl font-bold">{analysis.totalPayments}</div>
            </div>
            
            <div className="bg-success/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">With Allocations</span>
              </div>
              <div className="text-2xl font-bold text-success">{analysis.paymentsWithAllocations}</div>
            </div>
            
            <div className="bg-warning/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Need Sync</span>
              </div>
              <div className="text-2xl font-bold text-warning">{analysis.paymentsWithoutAllocations}</div>
            </div>
            
            <div className="bg-info/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-info" />
                <span className="text-sm font-medium">Potential Matches</span>
              </div>
              <div className="text-2xl font-bold text-info">{analysis.potentialMatches.length}</div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={runAnalysis} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
            <Button onClick={handleRecalculateAll} variant="outline" disabled={isSyncing}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Recalculate All Balances
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Potential Matches */}
      {analysis.potentialMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Payment-Invoice Matches ({analysis.potentialMatches.length})
            </CardTitle>
            <CardDescription>
              Suggested matches between unallocated payments and invoices. Select matches to synchronize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {analysis.potentialMatches.map((match, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedMatches.has(index)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedMatches);
                        if (checked) {
                          newSelected.add(index);
                        } else {
                          newSelected.delete(index);
                        }
                        setSelectedMatches(newSelected);
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getConfidenceBadge(match.confidence)}
                          <span className="text-sm text-muted-foreground">{match.reason}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(match.payment.amount)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Payment:</span>
                          <div>{match.payment.payment_number}</div>
                          <div className="text-muted-foreground">
                            {new Date(match.payment.payment_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Invoice:</span>
                          <div>{match.invoice.invoice_number}</div>
                          <div className="text-muted-foreground">
                            Total: {formatCurrency(match.invoice.total_amount)} | 
                            Balance: {formatCurrency(match.invoice.balance_due || (match.invoice.total_amount - (match.invoice.paid_amount || 0)))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedMatches.size} of {analysis.potentialMatches.length} matches selected
              </div>
              <Button 
                onClick={handleSync} 
                disabled={selectedMatches.size === 0 || isSyncing}
                className="bg-success hover:bg-success/90"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Synchronize Selected ({selectedMatches.size})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Results */}
      {syncResult && (
        <Card className={syncResult.success ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${syncResult.success ? 'text-success' : 'text-destructive'}`}>
              {syncResult.success ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              Synchronization Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Allocations Created:</span>
                <div className="text-xl font-bold text-success">{syncResult.allocationsCreated}</div>
              </div>
              <div>
                <span className="text-sm font-medium">Invoices Updated:</span>
                <div className="text-xl font-bold text-success">{syncResult.invoicesUpdated}</div>
              </div>
            </div>
            
            {syncResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Errors occurred during synchronization:</div>
                    {syncResult.errors.map((error, index) => (
                      <div key={index} className="text-sm">• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {syncResult.details.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium">Successfully processed:</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {syncResult.details.map((detail, index) => (
                    <div key={index} className="text-sm bg-muted p-2 rounded">
                      Payment {detail.payment} → Invoice {detail.invoice} ({formatCurrency(detail.amount)})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Sync Needed */}
      {analysis.paymentsWithoutAllocations === 0 && (
        <Card className="border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              All Payments Synchronized
            </CardTitle>
            <CardDescription>
              All payments have proper allocations and invoice balances are up to date.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
