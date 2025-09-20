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
  Package
} from 'lucide-react';
import { toast } from 'sonner';

export function StockMovementsSetup() {
  const [copiedSQL, setCopiedSQL] = useState(false);

  const migrationSQL = `-- Create stock_movements table for inventory tracking
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    product_id UUID NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT'
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2),
    reference_type VARCHAR(50), -- 'INVOICE', 'DELIVERY_NOTE', 'CREDIT_NOTE', 'ADJUSTMENT', 'PURCHASE'
    reference_id UUID,
    reference_number VARCHAR(255),
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
    -- Add company_id foreign key if companies table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        ALTER TABLE stock_movements 
        ADD CONSTRAINT fk_stock_movements_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    -- Add product_id foreign key if products table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE stock_movements 
        ADD CONSTRAINT fk_stock_movements_product_id 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_product_date ON stock_movements(company_id, product_id, movement_date);

-- Enable Row Level Security
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create function to update product stock based on movements
CREATE OR REPLACE FUNCTION update_product_stock(
    product_uuid UUID,
    movement_type VARCHAR(50),
    quantity DECIMAL(10,3)
)
RETURNS VOID AS $$
BEGIN
    IF movement_type = 'IN' THEN
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + quantity,
            updated_at = NOW()
        WHERE id = product_uuid;
    ELSIF movement_type = 'OUT' THEN
        UPDATE products 
        SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - quantity, 0),
            updated_at = NOW()
        WHERE id = product_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql;`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(migrationSQL);
      setCopiedSQL(true);
      toast.success('SQL script copied to clipboard!');
      
      setTimeout(() => setCopiedSQL(false), 3000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
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
            <span>Stock Movements Table Missing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Database Setup Required</strong><br />
              The stock_movements table is required for inventory tracking but is missing from your database. 
              This table is needed for credit notes that affect inventory, product stock updates, and inventory management.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <Package className="h-4 w-4 mr-2 text-primary" />
              What This Script Creates:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>stock_movements table for tracking all inventory movements</li>
              <li>Foreign key relationships to companies and products tables</li>
              <li>Indexes for optimal query performance</li>
              <li>update_product_stock function for automatic stock calculations</li>
              <li>Row Level Security policies for data isolation</li>
            </ul>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={copyToClipboard}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SQL Migration Script</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={migrationSQL}
            readOnly
            className="h-64 font-mono text-sm"
            onClick={(e) => e.currentTarget.select()}
          />
          
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Instructions:</strong><br />
              1. Copy the SQL script above<br />
              2. Open your Supabase SQL Editor<br />
              3. Paste and execute the script<br />
              4. Verify the table was created successfully<br />
              5. Try creating a credit note with inventory effects
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
