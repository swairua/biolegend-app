import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  RefreshCw, 
  Shield, 
  Code,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { diagnoseProformaRLS, formatRLSDiagnostics } from '@/utils/rlsDiagnostics';
import { testRLSPolicies, fixProformaRLSPolicies } from '@/utils/fixProformaRLS';

interface RLSStatus {
  status: 'checking' | 'healthy' | 'warning' | 'error';
  message: string;
  details?: string[];
}

export const ProformaRLSFixer: React.FC<{ proformaId?: string }> = ({ proformaId }) => {
  const [status, setStatus] = useState<RLSStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [showSql, setShowSql] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleDiagnose = async () => {
    setIsChecking(true);
    setStatus({ status: 'checking', message: 'Diagnosing RLS configuration...' });

    try {
      if (!proformaId) {
        setStatus({
          status: 'warning',
          message: 'No proforma ID provided',
          details: ['Please provide a proforma ID to run diagnostics']
        });
        setIsChecking(false);
        return;
      }

      // Get diagnostics for the specific proforma
      const diag = await diagnoseProformaRLS(proformaId);
      setDiagnostics(diag);

      if (diag.errors.length === 0) {
        setStatus({
          status: 'healthy',
          message: '✅ RLS configuration looks good!',
          details: [
            `User can access proformas: ${diag.canAccessProforma}`,
            `User company: ${diag.userCompanyId || 'Not set'}`,
            `Proforma company: ${diag.proformaCompanyId || 'Not set'}`
          ]
        });
      } else {
        setStatus({
          status: 'error',
          message: '❌ RLS issues detected',
          details: diag.errors
        });
      }
    } catch (error) {
      setStatus({
        status: 'error',
        message: 'Failed to diagnose RLS issues',
        details: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleTestPolicies = async () => {
    if (!proformaId) {
      toast.error('Please provide a proforma ID');
      return;
    }

    setIsChecking(true);
    try {
      const result = await testRLSPolicies(proformaId);
      setTestResult(result);
      
      if (result.success) {
        toast.success('✅ RLS policies test passed!');
      } else {
        toast.error(`❌ RLS test failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Failed to test RLS policies');
    } finally {
      setIsChecking(false);
    }
  };

  const handleGetFixSQL = () => {
    try {
      const result = fixProformaRLSPolicies();
      if (result && result.sql) {
        setShowSql(true);
        toast.success('SQL generated - copy it below');
      }
    } catch (error) {
      toast.error('Failed to generate SQL');
    }
  };

  const handleCopySQL = () => {
    try {
      const result = fixProformaRLSPolicies();
      if (result && result.sql) {
        navigator.clipboard.writeText(result.sql);
        toast.success('SQL copied to clipboard!');
      }
    } catch (error) {
      toast.error('Failed to copy SQL');
    }
  };

  const getFixSQL = () => {
    const result = fixProformaRLSPolicies();
    return result && result.sql ? result.sql : '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>RLS Policy Diagnostic & Fix</CardTitle>
              <CardDescription>
                Diagnose and fix Row Level Security issues preventing proforma deletion
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          {status && (
            <Alert className={
              status.status === 'healthy' ? 'border-green-500 bg-green-50' :
              status.status === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              status.status === 'error' ? 'border-red-500 bg-red-50' :
              'border-blue-500 bg-blue-50'
            }>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">{status.message}</div>
                {status.details && status.details.length > 0 && (
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    {status.details.map((detail, i) => (
                      <li key={i} className="text-sm">{detail}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Diagnostic Tabs */}
          <Tabs defaultValue="diagnose" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="diagnose">Diagnose</TabsTrigger>
              <TabsTrigger value="fix">Fix</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            {/* Diagnose Tab */}
            <TabsContent value="diagnose" className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Run diagnostics to check your RLS configuration and identify issues.
                </p>
                <Button
                  onClick={handleDiagnose}
                  disabled={isChecking}
                  className="w-full"
                >
                  {isChecking ? 'Diagnosing...' : 'Run Diagnostics'}
                </Button>
              </div>

              {diagnostics && (
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="text-sm">Diagnostic Results</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span>User ID:</span>
                      <Badge variant="outline">{diagnostics.userId?.slice(0, 8)}...</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Has Profile:</span>
                      <Badge variant={diagnostics.hasProfile ? 'default' : 'destructive'}>
                        {diagnostics.hasProfile ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>User Company ID:</span>
                      <Badge variant="outline">{diagnostics.userCompanyId || 'Not Set'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Proforma Company ID:</span>
                      <Badge variant="outline">{diagnostics.proformaCompanyId || 'Not Found'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Can Access:</span>
                      <Badge variant={diagnostics.canAccessProforma ? 'default' : 'destructive'}>
                        {diagnostics.canAccessProforma ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {diagnostics.errors.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="font-semibold text-red-600 mb-2">Errors:</div>
                        {diagnostics.errors.map((err: string, i: number) => (
                          <div key={i} className="text-red-600 ml-2">- {err}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Fix Tab */}
            <TabsContent value="fix" className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <Code className="h-4 w-4" />
                <AlertDescription>
                  The RLS policies need to be updated in your Supabase SQL editor to fix the deletion issue.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={handleGetFixSQL}
                  variant="outline"
                  className="w-full"
                >
                  {showSql ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                  Show SQL to Fix RLS Policies
                </Button>

                {showSql && (
                  <div className="space-y-2">
                    <Button
                      onClick={handleCopySQL}
                      variant="secondary"
                      className="w-full"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy SQL
                    </Button>

                    <Card className="bg-slate-900 border-slate-700">
                      <CardContent className="pt-4 p-4">
                        <pre className="text-xs text-green-400 overflow-auto max-h-96 font-mono">
                          {getFixSQL()}
                        </pre>
                      </CardContent>
                    </Card>

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-2">Steps to Apply the Fix:</div>
                        <ol className="list-decimal ml-5 space-y-1 text-sm">
                          <li>Go to Supabase Dashboard → SQL Editor</li>
                          <li>Paste the SQL above</li>
                          <li>Click "Run" to apply the policies</li>
                          <li>Return here and click "Test Fix" to verify</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Test Tab */}
            <TabsContent value="test" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Test if the RLS policies are working correctly after applying the fix.
              </p>

              <Button
                onClick={handleTestPolicies}
                disabled={isChecking || !proformaId}
                className="w-full"
              >
                {isChecking ? 'Testing...' : 'Test RLS Policies'}
              </Button>

              {testResult && (
                <Card className={testResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  <CardContent className="pt-4 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-900">Test Passed! ✅</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span className="font-semibold text-red-900">Test Failed ❌</span>
                        </>
                      )}
                    </div>
                    {testResult.error && (
                      <p className="text-sm text-muted-foreground">{testResult.error}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Common Issues */}
          <Card className="bg-slate-50">
            <CardHeader>
              <CardTitle className="text-sm">Common Issues & Solutions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-semibold text-destructive">❌ "0 rows affected" on delete</div>
                <p className="text-muted-foreground">RLS policy is blocking the delete. Apply the SQL fix above.</p>
              </div>
              <div>
                <div className="font-semibold text-destructive">❌ "User company mismatch"</div>
                <p className="text-muted-foreground">Your user profile doesn't have a company assigned. Contact your administrator.</p>
              </div>
              <div>
                <div className="font-semibold text-destructive">❌ "No profile found"</div>
                <p className="text-muted-foreground">Your user doesn't have a profile. Admin needs to create it or you'll be auto-created on next login.</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
