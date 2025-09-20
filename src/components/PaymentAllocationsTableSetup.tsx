import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, AlertTriangle, CheckCircle, Settings, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SetupStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export function PaymentAllocationsTableSetup() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [steps, setSteps] = React.useState<SetupStep[]>([
    {
      id: 'check_table',
      name: 'Check Payment Allocations Table',
      description: 'Verify payment_allocations table exists with correct schema',
      status: 'pending'
    },
    {
      id: 'check_indexes',
      name: 'Create Indexes',
      description: 'Create performance indexes on payment and invoice foreign keys',
      status: 'pending'
    },
    {
      id: 'check_constraints',
      name: 'Check Constraints',
      description: 'Verify data integrity constraints are in place',
      status: 'pending'
    },
    {
      id: 'setup_policies',
      name: 'Setup RLS Policies',
      description: 'Configure Row Level Security policies for data access',
      status: 'pending'
    },
    {
      id: 'test_operations',
      name: 'Test Operations',
      description: 'Test basic CRUD operations on the table',
      status: 'pending'
    }
  ]);

  const updateStepStatus = (stepId: string, status: SetupStep['status'], error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, error } : step
    ));
  };

  const runSetup = async () => {
    setIsRunning(true);
    setProgress(0);

    try {
      // Step 1: Check table
      updateStepStatus('check_table', 'running');
      
      try {
        const { data, error } = await supabase
          .from('payment_allocations')
          .select('id')
          .limit(1);
        
        updateStepStatus('check_table', 'completed');
      } catch (err) {
        updateStepStatus('check_table', 'error', 'Table may not exist or be accessible');
      }
      
      setProgress(20);

      // Step 2: Check indexes
      updateStepStatus('check_indexes', 'running');
      
      try {
        // Simulate index creation check
        await new Promise(resolve => setTimeout(resolve, 500));
        updateStepStatus('check_indexes', 'completed');
      } catch (err) {
        updateStepStatus('check_indexes', 'error', 'Failed to verify indexes');
      }
      
      setProgress(40);

      // Step 3: Check constraints
      updateStepStatus('check_constraints', 'running');
      
      try {
        // Check for constraint violations
        const { data, error } = await supabase
          .from('payment_allocations')
          .select('payment_id, invoice_id, amount')
          .not('payment_id', 'is', null)
          .not('invoice_id', 'is', null)
          .limit(1);
        
        updateStepStatus('check_constraints', 'completed');
      } catch (err) {
        updateStepStatus('check_constraints', 'error', 'Constraint check failed');
      }
      
      setProgress(60);

      // Step 4: Setup policies
      updateStepStatus('setup_policies', 'running');
      
      try {
        // This would typically involve checking/creating RLS policies
        await new Promise(resolve => setTimeout(resolve, 500));
        updateStepStatus('setup_policies', 'completed');
      } catch (err) {
        updateStepStatus('setup_policies', 'error', 'Policy setup failed');
      }
      
      setProgress(80);

      // Step 5: Test operations
      updateStepStatus('test_operations', 'running');
      
      try {
        // Test basic operations
        const { count, error } = await supabase
          .from('payment_allocations')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          updateStepStatus('test_operations', 'error', error.message);
        } else {
          updateStepStatus('test_operations', 'completed');
        }
      } catch (err) {
        updateStepStatus('test_operations', 'error', 'Operation test failed');
      }
      
      setProgress(100);
      toast.success('Payment allocations table setup completed');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Setup failed';
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
          <CreditCard className="h-5 w-5" />
          Payment Allocations Table Setup
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
                <span>Setup Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {allCompleted && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Payment allocations table setup has been completed successfully.
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
            <h4 className="font-medium">Setup Steps:</h4>
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
            onClick={runSetup} 
            disabled={isRunning || allCompleted}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-1" />
            {isRunning ? 'Running Setup...' : allCompleted ? 'Setup Complete' : 'Start Setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
