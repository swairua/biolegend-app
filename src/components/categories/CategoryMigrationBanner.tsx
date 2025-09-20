import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Copy,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

export const CategoryMigrationBanner = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [migrationApplied, setMigrationApplied] = useState(false);

  const migrationSQL = `-- Product Categories Enhancement Migration
-- Copy and paste this into your Supabase SQL Editor

-- Add missing columns
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS color VARCHAR(7);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_code_company 
ON product_categories(company_id, category_code) 
WHERE category_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id 
ON product_categories(parent_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_categories_updated_at 
    BEFORE UPDATE ON product_categories 
    FOR EACH ROW EXECUTE PROCEDURE update_product_categories_updated_at();

-- Update existing records with sort order
UPDATE product_categories 
SET sort_order = sub.row_num * 10
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) as row_num
    FROM product_categories
    WHERE sort_order = 0 OR sort_order IS NULL
) sub
WHERE product_categories.id = sub.id;`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(migrationSQL);
      toast.success('Migration SQL copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleMigrationComplete = () => {
    setMigrationApplied(true);
    toast.success('Migration marked as complete! You can now use the enhanced category features.');
  };

  if (migrationApplied) {
    return (
      <Alert className="mb-4 border-success bg-success-light">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          <strong>Categories Enhanced!</strong> You can now use hierarchical categories, 
          color coding, custom ordering, and unique category codes.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4 border-warning bg-warning-light/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <Database className="h-5 w-5" />
          Category Enhancement Available
          <Badge variant="outline" className="bg-warning text-warning-foreground">
            Database Update Required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your category system is missing some powerful features! Apply the database 
            migration to enable hierarchical categories, color coding, unique codes, and custom ordering.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isExpanded ? 'Hide' : 'Show'} Migration Steps
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Migration SQL
          </Button>
          
          <Button 
            size="sm"
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            className="bg-warning hover:bg-warning/80 text-warning-foreground"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Supabase
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-4 mt-4 p-4 bg-background rounded-lg border">
            <h4 className="font-medium">Migration Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Copy the migration SQL using the button above</li>
              <li>Open your Supabase dashboard SQL Editor</li>
              <li>Paste and execute the migration SQL</li>
              <li>Verify the migration completed successfully</li>
              <li>Click "Migration Complete" below to unlock enhanced features</li>
            </ol>

            <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-40">
              <pre>{migrationSQL}</pre>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                This migration is safe and backwards compatible
              </div>
              <Button 
                onClick={handleMigrationComplete}
                size="sm"
                className="bg-success hover:bg-success/80 text-success-foreground"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Migration Complete
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <strong>New Features:</strong> Hierarchical categories, color coding, unique codes, 
          custom ordering, audit trails, and improved performance.
        </div>
      </CardContent>
    </Card>
  );
};
