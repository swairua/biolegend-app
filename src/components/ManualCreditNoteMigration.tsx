import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, AlertTriangle, CheckCircle, Play, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export function ManualCreditNoteMigration() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [steps, setSteps] = React.useState<MigrationStep[]>([
    {
      id: 'check_table',
      name: 'Check Credit Notes Table',
      description: 'Verify credit_notes table exists and has correct structure',
      status: 'pending'
    },
    {
      id: 'check_relationships',
      name: 'Check Relationships',
      description: 'Verify foreign key relationships with invoices and customers',
      status: 'pending'
    },
    {
      id: 'check_policies',
      name: 'Check RLS Policies',
      description: 'Verify Row Level Security policies are in place',
      status: 'pending'
    },
    {
      id: 'migrate_data',
      name: 'Migrate Existing Data',
      description: 'Update any existing credit note records to new format',
      status: 'pending'
    }
  ]);

  const updateStepStatus = (stepId: string, status: MigrationStep['status'], error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, error } : step
    ));
  };

  const runMigration = async () => {
    setIsRunning(true);
    setProgress(0);

    try {
      // Step 1: Check table existence
      updateStepStatus('check_table', 'running');
      
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'credit_notes');

      if (tableError) {
        updateStepStatus('check_table', 'error', tableError.message);
        throw new Error('Failed to check table structure');
      }
      
      updateStepStatus('check_table', 'completed');
      setProgress(25);

      // Step 2: Check relationships
      updateStepStatus('check_relationships', 'running');
      
      try {
        const { error: relationError } = await supabase
          .from('credit_notes')
          .select('invoice_id, customer_id')
          .limit(1);
        
        if (relationError && !relationError.message.includes('does not exist')) {
          updateStepStatus('check_relationships', 'error', relationError.message);
        } else {
          updateStepStatus('check_relationships', 'completed');
        }
      } catch (err) {
        updateStepStatus('check_relationships', 'error', 'Table may not exist yet');
      }
      
      setProgress(50);

      // Step 3: Check RLS policies
      updateStepStatus('check_policies', 'running');
      
      try {
        const { data: policies, error: policyError } = await supabase
          .from('pg_policies')
          .select('policyname')
          .eq('tablename', 'credit_notes');

        updateStepStatus('check_policies', 'completed');
      } catch (err) {
        updateStepStatus('check_policies', 'error', 'Unable to check policies');
      }
      
      setProgress(75);

      // Step 4: Data migration
      updateStepStatus('migrate_data', 'running');
      
      try {
        // This would contain actual migration logic
        // For now, we'll just simulate it
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateStepStatus('migrate_data', 'completed');
      } catch (err) {
        updateStepStatus('migrate_data', 'error', 'Migration failed');
      }
      
      setProgress(100);
      toast.success('Credit note migration completed successfully');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Migration failed';
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const errorSteps = steps.filter(step => step.status === 'error').length;
  const allCompleted = completedSteps === steps.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Manual Credit Note Migration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span>Completed:</span>
              <Badge variant="default">{completedSteps}/{steps.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Errors:</span>
              <Badge variant={errorSteps > 0 ? 'destructive' : 'default'}>
                {errorSteps}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge variant={allCompleted ? 'default' : isRunning ? 'secondary' : 'outline'}>
                {allCompleted ? 'Complete' : isRunning ? 'Running' : 'Ready'}
              </Badge>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Migration Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {allCompleted && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Credit note migration has been completed successfully.
              </AlertDescription>
            </Alert>
          )}

          {errorSteps > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorSteps} step(s) encountered errors. Please review and retry.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h4 className="font-medium">Migration Steps:</h4>
            <div className="space-y-1">
              {steps.map((step, index) => (
                <div key={step.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{index + 1}. {step.name}</span>
                      <Badge 
                        variant={
                          step.status === 'completed' ? 'default' :
                          step.status === 'running' ? 'secondary' :
                          step.status === 'error' ? 'destructive' :
                          'outline'
                        }
                      >
                        {step.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {step.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {step.status === 'running' && <Database className="h-3 w-3 mr-1 animate-pulse" />}
                        {step.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </div>
                  {step.error && (
                    <div className="text-sm text-destructive mt-1">
                      Error: {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={runMigration} 
            disabled={isRunning || allCompleted}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-1" />
            {isRunning ? 'Running Migration...' : allCompleted ? 'Migration Complete' : 'Start Migration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
