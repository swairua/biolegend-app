import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  RefreshCw 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SchemaStatus {
  stock_movements: 'exists' | 'missing' | 'error' | 'checking';
}

export function DatabaseSchemaInitializer() {
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus>({
    stock_movements: 'checking'
  });
  const [isInitializing, setIsInitializing] = useState(false);

  const checkSchemaStatus = async () => {
    try {
      // Check if stock_movements table exists
      const { error: stockMovementsError } = await supabase
        .from('stock_movements')
        .select('id')
        .limit(1);

      const stockMovementsStatus = stockMovementsError 
        ? (stockMovementsError.code === 'PGRST116' ? 'missing' : 'error')
        : 'exists';

      setSchemaStatus({
        stock_movements: stockMovementsStatus
      });

    } catch (error) {
      console.error('Error checking schema status:', error);
      setSchemaStatus({
        stock_movements: 'error'
      });
    }
  };

  const initializeStockMovementsTable = async () => {
    setIsInitializing(true);
    try {
      // Create the stock_movements table using SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS stock_movements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          product_id UUID NOT NULL,
          movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
          reference_type VARCHAR(50) CHECK (reference_type IN ('INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE')),
          reference_id UUID,
          quantity DECIMAL(10,3) NOT NULL,
          cost_per_unit DECIMAL(15,2),
          notes TEXT,
          movement_date DATE DEFAULT CURRENT_DATE,
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add foreign key constraints if tables exist
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
            ALTER TABLE stock_movements 
            ADD CONSTRAINT IF NOT EXISTS fk_stock_movements_company_id 
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
            ALTER TABLE stock_movements 
            ADD CONSTRAINT IF NOT EXISTS fk_stock_movements_product_id 
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
          END IF;
        END $$;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);

        -- Enable RLS
        ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

        -- Create basic RLS policies
        DROP POLICY IF EXISTS "stock_movements_select_policy" ON stock_movements;
        CREATE POLICY "stock_movements_select_policy" ON stock_movements
          FOR SELECT USING (true);

        DROP POLICY IF EXISTS "stock_movements_insert_policy" ON stock_movements;
        CREATE POLICY "stock_movements_insert_policy" ON stock_movements
          FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "stock_movements_update_policy" ON stock_movements;
        CREATE POLICY "stock_movements_update_policy" ON stock_movements
          FOR UPDATE USING (true);
      `;

      const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

      if (error) {
        // If rpc doesn't exist, try alternative approach
        console.error('RPC method failed, trying alternative approach:', error);
        toast.error('Unable to create table automatically. Please run the migration manually.');
        return;
      }

      toast.success('Stock movements table created successfully!');
      await checkSchemaStatus();

    } catch (error) {
      console.error('Error initializing stock movements table:', error);
      toast.error('Failed to initialize stock movements table. Please contact system administrator.');
    } finally {
      setIsInitializing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exists':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'exists':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'missing':
        return <Badge className="bg-red-100 text-red-800">Missing</Badge>;
      case 'error':
        return <Badge className="bg-yellow-100 text-yellow-800">Error</Badge>;
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800">Checking...</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Schema Status
        </CardTitle>
        <CardDescription>
          Check and initialize required database tables for inventory management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={checkSchemaStatus} disabled={isInitializing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Schema Status
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(schemaStatus.stock_movements)}
              <div>
                <div className="font-medium">Stock Movements Table</div>
                <div className="text-sm text-gray-600">
                  Required for inventory tracking when creating invoices
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(schemaStatus.stock_movements)}
              {schemaStatus.stock_movements === 'missing' && (
                <Button 
                  size="sm" 
                  onClick={initializeStockMovementsTable}
                  disabled={isInitializing}
                >
                  {isInitializing ? 'Creating...' : 'Create Table'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {schemaStatus.stock_movements === 'missing' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The stock_movements table is missing. This may cause invoice creation to fail when trying to track inventory changes. 
              Click "Create Table" to initialize the required schema.
            </AlertDescription>
          </Alert>
        )}

        {schemaStatus.stock_movements === 'error' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              There was an error checking the stock_movements table. This may indicate a permissions issue or database connectivity problem.
              Please contact your system administrator.
            </AlertDescription>
          </Alert>
        )}

        {schemaStatus.stock_movements === 'exists' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All required database tables are present and ready for use.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
