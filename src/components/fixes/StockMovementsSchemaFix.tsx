import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  Copy,
  Database,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { fixStockMovementsSchema, STOCK_MOVEMENTS_FIX_SQL } from '@/utils/fixStockMovementsSchema';

export function StockMovementsSchemaFix() {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showSQL, setShowSQL] = useState(false);

  const handleAutoFix = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const result = await fixStockMovementsSchema();
      setFixResult(result);
      
      if (result.success) {
        toast.success('Stock movements schema fixed successfully!');
      } else {
        toast.error(`Fix failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFixResult({ success: false, error: errorMessage });
      toast.error(`Fix failed: ${errorMessage}`);
    } finally {
      setIsFixing(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(STOCK_MOVEMENTS_FIX_SQL);
    toast.success('SQL copied to clipboard');
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-600" />
          Stock Movements Schema Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Invoice Creation Error Fix</strong><br />
            This tool fixes the "could not find updated_at column of 'stock_movements' in the schema cache" error
            that prevents invoice creation from working properly.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline">Error</Badge>
            <span className="text-sm">Missing updated_at column in stock_movements table</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline">Solution</Badge>
            <span className="text-sm">Add updated_at column with proper triggers</span>
          </div>
        </div>

        {fixResult && (
          <Alert className={fixResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {fixResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              <strong>{fixResult.success ? 'Success!' : 'Error:'}</strong><br />
              {fixResult.success ? fixResult.message : fixResult.error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAutoFix}
            disabled={isFixing}
            className="flex items-center gap-2"
          >
            {isFixing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying Fix...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                Auto-Fix Schema
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSQL(!showSQL)}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {showSQL ? 'Hide' : 'Show'} Manual SQL
          </Button>
        </div>

        {showSQL && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Manual SQL Fix</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copySQL}
                className="flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy SQL
              </Button>
            </div>
            
            <div className="bg-gray-100 p-3 rounded-md">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {STOCK_MOVEMENTS_FIX_SQL}
              </pre>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p><strong>Manual Steps:</strong></p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Copy the SQL above</li>
                <li>Open your Supabase SQL editor</li>
                <li>Paste and execute the SQL</li>
                <li>Try creating an invoice again</li>
              </ol>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md">
          <p><strong>What this fix does:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Adds the missing <code>updated_at</code> column to the stock_movements table</li>
            <li>Sets default values for existing records</li>
            <li>Creates a trigger to automatically update the timestamp on record changes</li>
            <li>Ensures invoice creation can track inventory changes properly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
