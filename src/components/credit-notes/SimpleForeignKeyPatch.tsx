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

export function SimpleForeignKeyPatch() {
  const [copied, setCopied] = useState(false);

  // Simplified patch that just adds the constraints
  const patchSQL = `-- Simple Foreign Key Constraints Patch
-- Run this in Supabase SQL Editor

-- Add foreign key constraints with proper names
-- These will be ignored if they already exist

ALTER TABLE credit_notes 
ADD CONSTRAINT IF NOT EXISTS credit_notes_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id);

ALTER TABLE credit_notes 
ADD CONSTRAINT IF NOT EXISTS credit_notes_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE credit_notes 
ADD CONSTRAINT IF NOT EXISTS credit_notes_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';

-- Done! The relationship error should now be resolved.`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(patchSQL);
      setCopied(true);
      toast.success('Simple patch SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy SQL');
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <Card className="border-primary/20 bg-primary-light/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-primary" />
          <span>Simple Foreign Key Fix</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Quick & Simple Fix</strong><br />
            This adds explicit foreign key constraints and refreshes the schema cache. No complex queries.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-4">
          <Button
            onClick={copyToClipboard}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Simple Fix'}
          </Button>

          <Button
            variant="outline"
            onClick={openSupabase}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Supabase
          </Button>
        </div>

        <div className="bg-muted p-3 rounded font-mono text-xs">
          <pre className="whitespace-pre-wrap">{patchSQL}</pre>
        </div>

        <Alert className="border-success/20 bg-success-light/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success-foreground">
            <strong>This simple patch will:</strong><br />
            • Add named foreign key constraints if missing<br />
            • Refresh Supabase schema cache<br />
            • Resolve the relationship detection error<br />
            • No complex verification queries
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
