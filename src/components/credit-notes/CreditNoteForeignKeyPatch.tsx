import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Copy,
  ExternalLink,
  Database,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function CreditNoteForeignKeyPatch() {
  const [copied, setCopied] = useState(false);

  // Quick patch to add missing foreign key constraints
  const patchSQL = `-- Foreign Key Constraints Patch for Credit Notes
-- Run this in Supabase SQL Editor to fix relationship issues

-- Add explicit foreign key constraints (may already exist, but this ensures they're properly named)
DO $$ 
BEGIN
    -- Add foreign key constraint for company_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_notes_company_id_fkey' 
        AND table_name = 'credit_notes'
    ) THEN
        ALTER TABLE credit_notes 
        ADD CONSTRAINT credit_notes_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;

    -- Add foreign key constraint for customer_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_notes_customer_id_fkey' 
        AND table_name = 'credit_notes'
    ) THEN
        ALTER TABLE credit_notes 
        ADD CONSTRAINT credit_notes_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id);
    END IF;

    -- Add foreign key constraint for invoice_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_notes_invoice_id_fkey' 
        AND table_name = 'credit_notes'
    ) THEN
        ALTER TABLE credit_notes 
        ADD CONSTRAINT credit_notes_invoice_id_fkey 
        FOREIGN KEY (invoice_id) REFERENCES invoices(id);
    END IF;
END $$;

-- Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the constraints were added
SELECT
    tc.constraint_name,
    kcu.table_name,
    kcu.column_name,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.table_name = 'credit_notes';`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(patchSQL);
      setCopied(true);
      toast.success('Foreign key patch SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy SQL');
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <Card className="border-warning/20 bg-warning-light/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-warning" />
          <span>Foreign Key Relationships Patch</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Quick Fix for Relationship Issues</strong><br />
            This patch adds explicit foreign key constraints to ensure Supabase recognizes the relationships properly.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-4">
          <Button
            onClick={copyToClipboard}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Patch SQL'}
          </Button>

          <Button
            variant="outline"
            onClick={openSupabase}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Supabase
          </Button>
        </div>

        <div className="bg-muted p-3 rounded font-mono text-xs max-h-48 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{patchSQL}</pre>
        </div>

        <Alert className="border-success/20 bg-success-light/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success-foreground">
            <strong>After running this patch:</strong><br />
            • Foreign key relationships will be explicitly defined<br />
            • Supabase schema cache will be refreshed<br />
            • The relationship error should disappear<br />
            • Credit notes will work properly with customer data
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
