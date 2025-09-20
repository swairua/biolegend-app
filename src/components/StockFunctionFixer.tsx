import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createStockUpdateFunction, testStockUpdateFunction } from '@/utils/runStockFunctionFix';

export function StockFunctionFixer() {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleCreateFunction = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const result = await createStockUpdateFunction();
      setFixResult(result);
      
      if (result.success) {
        toast.success('Stock update function created successfully!');
        
        // Test the function after creation
        const testResult = await testStockUpdateFunction();
        if (!testResult.success) {
          toast.warning('Function created but test failed. Please check logs.');
        }
      } else {
        toast.error(`Failed to create function: ${result.error}`);
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
          <Database className="h-5 w-5 text-blue-600" />
          Stock Update Function Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Stock Update Error Fix</strong><br />
            This creates the missing or broken `update_product_stock` database function that handles inventory updates during invoice creation.
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
            <li>Creates the `update_product_stock` database function</li>
            <li>Handles IN, OUT, and ADJUSTMENT movement types</li>
            <li>Validates parameters and prevents negative stock</li>
            <li>Updates product stock quantities and timestamps</li>
            <li>Grants proper permissions for the application</li>
          </ul>
        </div>

        <Button 
          onClick={handleCreateFunction} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Function...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Create Stock Update Function
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
