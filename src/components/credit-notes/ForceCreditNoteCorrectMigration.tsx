import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { executeSQL, formatSQLForManualExecution } from '@/utils/execSQL';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  Zap,
  FileCode,
  ArrowRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { parseErrorMessage } from '@/utils/errorHelpers';

interface MigrationStep {
  id: string;
  name: string;
  sql: string;
  critical: boolean;
  description: string;
}

export function ForceCreditNoteCorrectMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [failedSteps, setFailedSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [manualExecutionRequired, setManualExecutionRequired] = useState(false);
  const [manualSQL, setManualSQL] = useState<string>('');

  // The CORRECT credit note schema from creditNoteMigration.sql
  const migrationSteps: MigrationStep[] = [
    {
      id: 'drop_incorrect_tables',
      name: 'Drop Incorrect Tables',
      critical: true,
      description: 'Remove any existing incomplete credit note tables',
      sql: `
        -- Drop incorrect tables if they exist
        DROP TABLE IF EXISTS credit_note_allocations CASCADE;
        DROP TABLE IF EXISTS credit_note_items CASCADE; 
        DROP TABLE IF EXISTS credit_notes CASCADE;
        
        -- Drop incorrect functions
        DROP FUNCTION IF EXISTS generate_credit_note_number(UUID);
        DROP FUNCTION IF EXISTS apply_credit_note_to_invoice(UUID, UUID, DECIMAL, UUID);
      `
    },
    {
      id: 'create_credit_notes',
      name: 'Create Credit Notes Table',
      critical: true,
      description: 'Create the correct credit notes table with all required fields',
      sql: `
        CREATE TABLE IF NOT EXISTS credit_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id),
            customer_id UUID NOT NULL REFERENCES customers(id),
            invoice_id UUID REFERENCES invoices(id), -- Optional reference to original invoice
            credit_note_number TEXT NOT NULL,
            credit_note_date DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'applied', 'cancelled')),
            reason TEXT, -- Reason for credit note (returns, discount, error correction, etc.)
            
            -- Financial fields
            subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
            tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            applied_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Amount already applied to invoices
            balance DECIMAL(12,2) NOT NULL DEFAULT 0, -- Remaining credit balance
            
            -- Inventory control
            affects_inventory BOOLEAN NOT NULL DEFAULT false,
            
            -- Additional info
            notes TEXT,
            terms_and_conditions TEXT,
            
            -- Audit fields
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Constraints
            UNIQUE(company_id, credit_note_number)
        );
      `
    },
    {
      id: 'create_credit_note_items',
      name: 'Create Credit Note Items Table',
      critical: true,
      description: 'Create the credit note items table with correct tax fields',
      sql: `
        CREATE TABLE IF NOT EXISTS credit_note_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
            product_id UUID REFERENCES products(id), -- Optional, can be null for custom items
            
            -- Item details
            description TEXT NOT NULL,
            quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
            unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            
            -- Tax information (CORRECT FIELDS)
            tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
            tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            tax_inclusive BOOLEAN NOT NULL DEFAULT false,
            tax_setting_id UUID, -- Reference to tax settings
            
            -- Totals
            line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
            
            -- Ordering
            sort_order INTEGER NOT NULL DEFAULT 0,
            
            -- Audit
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      id: 'create_credit_note_allocations',
      name: 'Create Credit Note Allocations Table',
      critical: true,
      description: 'Create table for tracking credit applications to invoices',
      sql: `
        CREATE TABLE IF NOT EXISTS credit_note_allocations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
            invoice_id UUID NOT NULL REFERENCES invoices(id), -- References invoices table
            allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
            notes TEXT,
            
            -- Audit
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Constraints
            UNIQUE(credit_note_id, invoice_id)
        );
      `
    },
    {
      id: 'create_indexes',
      name: 'Create Performance Indexes',
      critical: false,
      description: 'Add indexes for optimal query performance',
      sql: `
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
        CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
        CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
        CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes(credit_note_date);
        CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
        CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(credit_note_number);

        CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
        CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);

        CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_credit_note_id ON credit_note_allocations(credit_note_id);
        CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_invoice_id ON credit_note_allocations(invoice_id);
      `
    },
    {
      id: 'create_functions',
      name: 'Create RPC Functions',
      critical: true,
      description: 'Create number generation and credit application functions',
      sql: `
        -- Create RPC function to generate credit note numbers
        CREATE OR REPLACE FUNCTION generate_credit_note_number(company_uuid UUID)
        RETURNS TEXT AS $$
        DECLARE
            next_number INTEGER;
            formatted_number TEXT;
        BEGIN
            -- Get the next number for this company
            SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
            INTO next_number
            FROM credit_notes
            WHERE company_id = company_uuid
            AND credit_note_number ~ '^CN[0-9]+$';
            
            -- Format the number with leading zeros
            formatted_number := 'CN' || LPAD(next_number::TEXT, 6, '0');
            
            RETURN formatted_number;
        END;
        $$ LANGUAGE plpgsql;

        -- Create RPC function to apply credit note to invoice
        CREATE OR REPLACE FUNCTION apply_credit_note_to_invoice(
            credit_note_uuid UUID,
            invoice_uuid UUID,
            amount_to_apply DECIMAL(12,2),
            applied_by_uuid UUID
        )
        RETURNS JSON AS $$
        DECLARE
            credit_note_record RECORD;
            invoice_record RECORD;
            available_credit DECIMAL(12,2);
            result JSON;
        BEGIN
            -- Get credit note details
            SELECT * INTO credit_note_record
            FROM credit_notes
            WHERE id = credit_note_uuid;
            
            IF NOT FOUND THEN
                RETURN json_build_object('success', false, 'error', 'Credit note not found');
            END IF;
            
            -- Get invoice details (assuming invoices table exists)
            SELECT id, balance_due, paid_amount, total_amount INTO invoice_record
            FROM invoices
            WHERE id = invoice_uuid;
            
            IF NOT FOUND THEN
                RETURN json_build_object('success', false, 'error', 'Invoice not found');
            END IF;
            
            -- Calculate available credit
            available_credit := credit_note_record.total_amount - credit_note_record.applied_amount;
            
            -- Validate application amount
            IF amount_to_apply <= 0 THEN
                RETURN json_build_object('success', false, 'error', 'Application amount must be positive');
            END IF;
            
            IF amount_to_apply > available_credit THEN
                RETURN json_build_object('success', false, 'error', 'Insufficient credit balance');
            END IF;
            
            IF amount_to_apply > invoice_record.balance_due THEN
                RETURN json_build_object('success', false, 'error', 'Amount exceeds invoice balance');
            END IF;
            
            -- Insert allocation record
            INSERT INTO credit_note_allocations (
                credit_note_id,
                invoice_id,
                allocated_amount,
                allocation_date,
                created_by
            ) VALUES (
                credit_note_uuid,
                invoice_uuid,
                amount_to_apply,
                CURRENT_DATE,
                applied_by_uuid
            )
            ON CONFLICT (credit_note_id, invoice_id)
            DO UPDATE SET
                allocated_amount = credit_note_allocations.allocated_amount + amount_to_apply,
                allocation_date = CURRENT_DATE;
            
            -- Update credit note applied amount and balance
            UPDATE credit_notes
            SET applied_amount = applied_amount + amount_to_apply,
                balance = total_amount - (applied_amount + amount_to_apply),
                status = CASE 
                    WHEN (applied_amount + amount_to_apply) >= total_amount THEN 'applied'
                    ELSE status
                END,
                updated_at = NOW()
            WHERE id = credit_note_uuid;
            
            -- Update invoice paid amount and balance
            UPDATE invoices
            SET paid_amount = paid_amount + amount_to_apply,
                balance_due = balance_due - amount_to_apply,
                updated_at = NOW()
            WHERE id = invoice_uuid;
            
            RETURN json_build_object(
                'success', true,
                'applied_amount', amount_to_apply,
                'remaining_credit', available_credit - amount_to_apply,
                'invoice_balance', invoice_record.balance_due - amount_to_apply
            );
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      id: 'create_triggers',
      name: 'Create Update Triggers',
      critical: false,
      description: 'Add triggers for automatic timestamp updates',
      sql: `
        -- Add trigger to update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;
        CREATE TRIGGER update_credit_notes_updated_at 
            BEFORE UPDATE ON credit_notes
            FOR EACH ROW 
            EXECUTE PROCEDURE update_updated_at_column();

        DROP TRIGGER IF EXISTS update_credit_note_items_updated_at ON credit_note_items;
        CREATE TRIGGER update_credit_note_items_updated_at 
            BEFORE UPDATE ON credit_note_items
            FOR EACH ROW 
            EXECUTE PROCEDURE update_updated_at_column();
      `
    }
  ];

  const executeMigration = async () => {
    setIsRunning(true);
    setProgress(0);
    setCompletedSteps([]);
    setFailedSteps([]);
    setCurrentStep('');
    setManualExecutionRequired(false);
    setManualSQL('');

    try {
      for (let i = 0; i < migrationSteps.length; i++) {
        const step = migrationSteps[i];
        setCurrentStep(step.name);
        setProgress((i / migrationSteps.length) * 100);

        try {
          console.log(`Executing step: ${step.name}`);

          // Execute the SQL using our utility
          const result = await executeSQL(step.sql);

          if (result.manual_execution_required) {
            // Manual execution is required
            setManualExecutionRequired(true);
            setManualSQL(prev => prev + '\n\n-- ' + step.name + '\n' + formatSQLForManualExecution(step.sql));

            toast.warning(`⚠️ ${step.name} requires manual execution in Supabase SQL Editor`);

            // Mark as completed for now, but note it needs manual work
            setCompletedSteps(prev => [...prev, step.id]);
          } else if (result.error) {
            throw result.error;
          } else {
            // Successfully executed
            setCompletedSteps(prev => [...prev, step.id]);
            toast.success(`✅ ${step.name} completed automatically`);
          }
          
        } catch (stepError: any) {
          console.error(`Error in step ${step.name}:`, stepError);
          const errorMessage = parseErrorMessage(stepError);
          setFailedSteps(prev => [...prev, step.id]);

          if (step.critical) {
            toast.error(`❌ Critical step failed: ${step.name} - ${errorMessage}`);
            break;
          } else {
            toast.warning(`⚠️ Non-critical step failed: ${step.name} - ${errorMessage}`);
          }
        }
      }

      setProgress(100);
      setCurrentStep('');
      
      if (failedSteps.length === 0) {
        if (manualExecutionRequired) {
          toast.success('🎉 Migration prepared! Please execute the SQL manually in Supabase.');
        } else {
          toast.success('🎉 Credit note migration completed successfully!');
        }
      } else if (failedSteps.some(id => migrationSteps.find(s => s.id === id)?.critical)) {
        toast.error('❌ Migration failed - critical steps could not be completed');
      } else {
        if (manualExecutionRequired) {
          toast.warning('⚠️ Migration partially complete - manual execution required for remaining steps');
        } else {
          toast.warning('⚠️ Migration completed with some non-critical failures');
        }
      }

    } catch (error: any) {
      console.error('Migration failed:', error);
      const errorMessage = parseErrorMessage(error);
      toast.error(`Migration failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (failedSteps.includes(stepId)) return 'failed';
    if (currentStep === migrationSteps.find(s => s.id === stepId)?.name) return 'running';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-4 w-4 border border-muted-foreground rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary-light/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Force Correct Credit Note Migration</span>
            <Badge variant="outline" className="bg-success-light text-success border-success/20">
              Schema A (Complete)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileCode className="h-4 w-4" />
            <AlertDescription>
              <strong>This will deploy the CORRECT credit note schema (Schema A)</strong><br />
              • Removes any incomplete schemas (Schema B from comprehensiveMigration.ts)<br />
              • Applies the complete version with all required fields:<br />
              • <code className="text-xs bg-muted px-1 rounded">tax_percentage</code> (not tax_rate),
              <code className="text-xs bg-muted px-1 rounded ml-1">tax_inclusive</code>,
              <code className="text-xs bg-muted px-1 rounded ml-1">tax_setting_id</code><br />
              • Makes my credit note fixes compatible and functional
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-4">
            <Button
              onClick={executeMigration}
              disabled={isRunning}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Database className="h-4 w-4 mr-2" />
              {isRunning ? 'Running Migration...' : 'Execute Correct Migration'}
            </Button>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{completedSteps.length}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{migrationSteps.length} steps</span>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentStep && (
                <p className="text-sm text-muted-foreground">
                  Currently executing: <strong>{currentStep}</strong>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium">Migration Steps:</h4>
            <div className="space-y-2">
              {migrationSteps.map((step) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="flex items-center justify-between p-3 rounded border">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status)}
                      <div>
                        <div className="font-medium text-sm">{step.name}</div>
                        <div className="text-xs text-muted-foreground">{step.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {step.critical && (
                        <Badge variant="outline" className="text-xs bg-warning-light text-warning border-warning/20">
                          Critical
                        </Badge>
                      )}
                      {getStatusBadge(status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {manualExecutionRequired && manualSQL && (
            <Card className="border-warning/20 bg-warning-light/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Manual Execution Required</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Some SQL statements require manual execution in the Supabase SQL Editor.
                  Copy the SQL below and execute it manually.
                </p>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(manualSQL);
                      toast.success('SQL copied to clipboard!');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Supabase
                  </Button>
                </div>

                <div className="bg-muted p-3 rounded font-mono text-xs max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{manualSQL}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {(completedSteps.length > 0 || failedSteps.length > 0) && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{completedSteps.length}</div>
                <div className="text-sm text-muted-foreground">
                  {manualExecutionRequired ? 'Ready for Manual Execution' : 'Completed'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{failedSteps.length}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
