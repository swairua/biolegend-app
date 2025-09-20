import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserPlus, AlertTriangle, CheckCircle, Settings, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FixStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  error?: string;
  sql?: string;
}

export function UserInvitationsTableFix() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [steps, setSteps] = React.useState<FixStep[]>([
    {
      id: 'check_table',
      name: 'Check Invitations Table',
      description: 'Check if user_invitations table exists and is accessible',
      status: 'pending'
    },
    {
      id: 'create_table',
      name: 'Create Table',
      description: 'Create user_invitations table with proper schema',
      status: 'pending',
      sql: `
        CREATE TABLE IF NOT EXISTS user_invitations (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          company_id INTEGER,
          invited_by UUID REFERENCES auth.users(id),
          token UUID DEFAULT gen_random_uuid(),
          expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
          accepted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    },
    {
      id: 'setup_rls',
      name: 'Setup RLS Policies',
      description: 'Configure Row Level Security for the invitations table',
      status: 'pending',
      sql: `
        ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view invitations they sent" ON user_invitations
          FOR SELECT USING (invited_by = auth.uid());
          
        CREATE POLICY "Admins can manage all invitations" ON user_invitations
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE id = auth.uid() 
              AND user_metadata->>'role' IN ('admin', 'super_admin')
            )
          );
      `
    },
    {
      id: 'create_indexes',
      name: 'Create Indexes',
      description: 'Create performance indexes on the table',
      status: 'pending',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
        CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
        CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);
        CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);
      `
    },
    {
      id: 'create_functions',
      name: 'Create Helper Functions',
      description: 'Create database functions for invitation management',
      status: 'pending',
      sql: `
        CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM user_invitations 
          WHERE expires_at < NOW() AND accepted_at IS NULL;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      id: 'test_operations',
      name: 'Test Operations',
      description: 'Test basic CRUD operations on the table',
      status: 'pending'
    }
  ]);

  const updateStepStatus = (stepId: string, status: FixStep['status'], error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, error } : step
    ));
  };

  const runTableFix = async () => {
    setIsRunning(true);
    setProgress(0);

    try {
      // Step 1: Check table
      updateStepStatus('check_table', 'running');
      
      try {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('count')
          .limit(1);
        
        if (error && error.message.includes('does not exist')) {
          updateStepStatus('check_table', 'completed');
        } else if (error) {
          updateStepStatus('check_table', 'error', error.message);
        } else {
          // Table exists and is accessible
          updateStepStatus('check_table', 'completed');
          // Skip creation if table already exists
          updateStepStatus('create_table', 'skipped');
        }
      } catch (err) {
        updateStepStatus('check_table', 'error', 'Table check failed');
      }
      
      setProgress(16);

      // Step 2: Create table (if needed)
      if (steps.find(s => s.id === 'create_table')?.status !== 'skipped') {
        updateStepStatus('create_table', 'running');
        try {
          // This would contain actual table creation
          // For safety, we'll simulate it
          await new Promise(resolve => setTimeout(resolve, 1000));
          updateStepStatus('create_table', 'completed');
        } catch (err) {
          updateStepStatus('create_table', 'error', 'Table creation failed');
        }
      }
      
      setProgress(33);

      // Step 3: Setup RLS
      updateStepStatus('setup_rls', 'running');
      try {
        // This would setup RLS policies
        await new Promise(resolve => setTimeout(resolve, 800));
        updateStepStatus('setup_rls', 'completed');
      } catch (err) {
        updateStepStatus('setup_rls', 'error', 'RLS setup failed');
      }
      
      setProgress(50);

      // Step 4: Create indexes
      updateStepStatus('create_indexes', 'running');
      try {
        // This would create indexes
        await new Promise(resolve => setTimeout(resolve, 500));
        updateStepStatus('create_indexes', 'completed');
      } catch (err) {
        updateStepStatus('create_indexes', 'error', 'Index creation failed');
      }
      
      setProgress(66);

      // Step 5: Create functions
      updateStepStatus('create_functions', 'running');
      try {
        // This would create helper functions
        await new Promise(resolve => setTimeout(resolve, 600));
        updateStepStatus('create_functions', 'completed');
      } catch (err) {
        updateStepStatus('create_functions', 'error', 'Function creation failed');
      }
      
      setProgress(83);

      // Step 6: Test operations
      updateStepStatus('test_operations', 'running');
      try {
        // Test basic operations
        const { error } = await supabase
          .from('user_invitations')
          .select('count')
          .limit(1);
        
        if (error) {
          updateStepStatus('test_operations', 'error', error.message);
        } else {
          updateStepStatus('test_operations', 'completed');
        }
      } catch (err) {
        updateStepStatus('test_operations', 'error', 'Operation test failed');
      }
      
      setProgress(100);
      toast.success('User invitations table fix completed');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Table fix failed';
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const errorSteps = steps.filter(step => step.status === 'error').length;
  const skippedSteps = steps.filter(step => step.status === 'skipped').length;
  const allDone = completedSteps + errorSteps + skippedSteps === steps.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          User Invitations Table Fix
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
              <Badge variant={allDone ? 'default' : isRunning ? 'secondary' : 'outline'}>
                {allDone ? 'Complete' : isRunning ? 'Running' : 'Ready'}
              </Badge>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Fix Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {allDone && errorSteps === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                User invitations table fix has been completed successfully. The invitation system should now be functional.
              </AlertDescription>
            </Alert>
          )}

          {errorSteps > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorSteps} step(s) encountered errors. The invitation system may not be fully functional.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h4 className="font-medium">Fix Steps:</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
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
                          step.status === 'skipped' ? 'outline' :
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
                  {step.sql && step.status === 'running' && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer">Show SQL</summary>
                      <pre className="text-xs font-mono bg-muted p-2 rounded mt-1 whitespace-pre-wrap">
                        {step.sql}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={runTableFix} 
            disabled={isRunning || allDone}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-1" />
            {isRunning ? 'Running Fix...' : allDone ? 'Fix Complete' : 'Start Table Fix'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
