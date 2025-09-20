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
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';

export function CreditNoteRelationshipFix() {
  const [copiedPatch, setCopiedPatch] = useState(false);

  const patchSQL = `-- Credit Notes Foreign Key Constraints Patch
-- Run this if you created credit_notes tables without proper foreign key relationships

-- Add foreign key constraint for company_id
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_company_id;

ALTER TABLE credit_notes 
ADD CONSTRAINT fk_credit_notes_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id);

-- Add foreign key constraint for customer_id  
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_customer_id;

ALTER TABLE credit_notes 
ADD CONSTRAINT fk_credit_notes_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Add foreign key constraint for invoice_id (optional)
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_invoice_id;

ALTER TABLE credit_notes 
ADD CONSTRAINT fk_credit_notes_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- Add foreign key constraint to credit_note_items for product_id
ALTER TABLE credit_note_items 
DROP CONSTRAINT IF EXISTS fk_credit_note_items_product_id;

ALTER TABLE credit_note_items 
ADD CONSTRAINT fk_credit_note_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id);

-- Add foreign key constraint to credit_note_allocations for invoice_id
ALTER TABLE credit_note_allocations 
DROP CONSTRAINT IF EXISTS fk_credit_note_allocations_invoice_id;

ALTER TABLE credit_note_allocations 
ADD CONSTRAINT fk_credit_note_allocations_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- Refresh the schema cache in Supabase
-- This helps Supabase recognize the new relationships
NOTIFY pgrst, 'reload schema';`;

  const copyPatchToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(patchSQL);
      setCopiedPatch(true);
      toast.success('Patch SQL copied to clipboard!');
      
      setTimeout(() => setCopiedPatch(false), 3000);
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
            <span>Relationship Fix Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Database Relationship Error Detected</strong><br />
              The credit_notes table exists but is missing proper foreign key relationships 
              to the customers table. This patch will fix the relationships.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <Wrench className="h-4 w-4 mr-2 text-primary" />
              What This Patch Does:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Adds foreign key constraint between credit_notes.customer_id → customers.id</li>
              <li>Adds foreign key constraint between credit_notes.company_id → companies.id</li>
              <li>Adds foreign key constraint between credit_notes.invoice_id → invoices.id</li>
              <li>Adds foreign key constraint between credit_note_items.product_id → products.id</li>
              <li>Refreshes Supabase schema cache to recognize relationships</li>
            </ul>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={copyPatchToClipboard}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {copiedPatch ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Patch SQL
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
          <CardTitle>Patch SQL Script</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={patchSQL}
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
              4. Refresh this page to verify the fix
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
