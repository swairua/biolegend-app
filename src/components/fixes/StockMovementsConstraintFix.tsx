import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Database,
  Copy,
  CheckCircle,
  ExternalLink,
  Wrench,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function StockMovementsConstraintFix() {
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null);

  const constraintFixSQL = `-- Fix stock_movements table constraints
-- Drop existing constraints if they exist
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;

-- Add correct constraints with uppercase values as expected by the application
ALTER TABLE stock_movements 
ADD CONSTRAINT stock_movements_movement_type_check 
CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT'));

ALTER TABLE stock_movements 
ADD CONSTRAINT stock_movements_reference_type_check 
CHECK (reference_type IN ('INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE'));

-- Ensure the table has the updated_at column
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to use correct case if needed
UPDATE stock_movements SET movement_type = UPPER(movement_type) WHERE movement_type != UPPER(movement_type);
UPDATE stock_movements SET reference_type = UPPER(reference_type) WHERE reference_type != UPPER(reference_type);

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_stock_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_stock_movements_updated_at ON stock_movements;
CREATE TRIGGER trigger_update_stock_movements_updated_at
  BEFORE UPDATE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_stock_movements_updated_at();`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(constraintFixSQL);
      setCopiedSQL(true);
      toast.success('SQL script copied to clipboard!');
      
      setTimeout(() => setCopiedSQL(false), 3000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const executeAutomaticFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      // Try to execute the fix using the supabase rpc if available
      const { error } = await supabase.rpc('exec_sql', { sql: constraintFixSQL });
      
      if (error) {
        console.error('RPC execution failed:', error);
        setFixResult({ 
          success: false, 
          message: 'Automatic fix failed. Please run the SQL script manually in your database.' 
        });
        toast.error('Automatic fix failed. Please use manual SQL execution.');
      } else {
        setFixResult({ 
          success: true, 
          message: 'Stock movements constraints fixed successfully!' 
        });
        toast.success('Stock movements constraints fixed successfully!');
      }
    } catch (error) {
      console.error('Error executing automatic fix:', error);
      setFixResult({ 
        success: false, 
        message: 'Automatic fix failed due to an error. Please run the SQL script manually.' 
      });
      toast.error('Automatic fix failed. Please use manual SQL execution.');
    } finally {
      setIsFixing(false);
    }
  };

  const openSupabaseSQLEditor = () => {
    const supabaseUrl = 'https://klifzjcfnlaxminytmyh.supabase.co';
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    window.open(`https://supabase.com/dashboard/project/${projectId}/sql`, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card className="border-warning/20 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <span>Stock Movements Constraint Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Check Constraint Violation Detected</strong><br />
              The stock_movements table has incorrect check constraints that don't match the application's expected values. 
              This is causing invoice creation to fail when trying to create stock movement records.
            </AlertDescription>
          </Alert>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-medium mb-2 text-red-900">Current Error:</h4>
            <p className="text-sm text-red-800 font-mono">
              invalid data: check constraint violation, new row for relation "stock movements" violates check constraint "stock_movements_type_check"
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <Wrench className="h-4 w-4 mr-2 text-primary" />
              What This Fix Does:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Removes any existing conflicting check constraints</li>
              <li>Adds correct constraints with uppercase values (IN, OUT, ADJUSTMENT)</li>
              <li>Adds correct reference_type constraint (INVOICE, DELIVERY_NOTE, etc.)</li>
              <li>Ensures updated_at column exists with proper trigger</li>
              <li>Updates any existing rows to use correct case</li>
            </ul>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={executeAutomaticFix}
              disabled={isFixing}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {isFixing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Auto Fix Constraints
                </>
              )}
            </Button>
            
            <Button
              onClick={copyToClipboard}
              variant="outline"
            >
              {copiedSQL ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL Script
                </>
              )}
            </Button>
            
            <Button
              onClick={openSupabaseSQLEditor}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open SQL Editor
            </Button>
          </div>

          {fixResult && (
            <Alert className={fixResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {fixResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={fixResult.success ? "text-green-800" : "text-red-800"}>
                {fixResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual SQL Fix Script</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={constraintFixSQL}
            readOnly
            className="h-64 font-mono text-sm"
            onClick={(e) => e.currentTarget.select()}
          />
          
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Instructions:</strong><br />
              1. Try the "Auto Fix Constraints" button first<br />
              2. If that fails, copy the SQL script above<br />
              3. Open your Supabase SQL Editor<br />
              4. Paste and execute the script<br />
              5. Verify the constraints were updated successfully<br />
              6. Try creating an invoice again
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
