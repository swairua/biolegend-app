import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { runStockMovementsConstraintFix } from '@/utils/runConstraintFix';

export function ConstraintFixRunner() {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleRunFix = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const result = await runStockMovementsConstraintFix();
      setFixResult(result);
      
      if (result.success) {
        toast.success('Stock movements constraints fixed successfully!');
      } else {
        toast.error(`Failed to fix constraints: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setFixResult({ success: false, error: errorMsg });
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-600" />
          Stock Movements Constraint Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Invoice Creation Error Detected</strong><br />
            There's a check constraint violation when creating invoices. This fix will update the database constraints to match the application's expected values.
          </AlertDescription>
        </Alert>

        {fixResult && (
          <Alert className={fixResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {fixResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={fixResult.success ? "text-green-800" : "text-red-800"}>
              {fixResult.success ? fixResult.message : fixResult.error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">What this fix does:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Updates check constraints to expect uppercase values (IN, OUT, ADJUSTMENT)</li>
            <li>Fixes reference_type constraints (INVOICE, DELIVERY_NOTE, etc.)</li>
            <li>Ensures updated_at column exists</li>
            <li>Updates existing data to match constraints</li>
            <li>Creates proper update triggers</li>
          </ul>
        </div>

        <Button 
          onClick={handleRunFix} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying Fix...
            </>
          ) : (
            <>
              <Wrench className="mr-2 h-4 w-4" />
              Apply Constraint Fix
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
