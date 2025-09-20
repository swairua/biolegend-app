import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  RefreshCw,
  User,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Wrench,
  Info
} from 'lucide-react';
import { logProformaRLSDiagnostics, diagnoseProformaRLS, type RLSDiagnostics } from '@/utils/rlsDiagnostics';
import { attemptRLSFix, getRLSPolicyInfo, type RLSFixResult } from '@/utils/rlsFixer';
import { toast } from 'sonner';

interface ProformaUpdateErrorHandlerProps {
  error: string;
  proformaId: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ProformaUpdateErrorHandler = ({
  error,
  proformaId,
  onRetry,
  onDismiss
}: ProformaUpdateErrorHandlerProps) => {
  const [diagnostics, setDiagnostics] = useState<RLSDiagnostics | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [fixResult, setFixResult] = useState<RLSFixResult | null>(null);
  const [isAttemptingFix, setIsAttemptingFix] = useState(false);
  const [showPolicyInfo, setShowPolicyInfo] = useState(false);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const result = await diagnoseProformaRLS(proformaId);
      setDiagnostics(result);

      if (result.errors.length === 0) {
        toast.success('No RLS issues detected - try updating again');
      } else {
        toast.warning(`Found ${result.errors.length} potential issues`);
      }
    } catch (diagError) {
      console.error('Diagnostics failed:', diagError);
      toast.error('Failed to run diagnostics');
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const attemptFix = async () => {
    setIsAttemptingFix(true);
    setFixResult(null);

    try {
      toast.info('Attempting to fix RLS issues...');
      const result = await attemptRLSFix(proformaId);
      setFixResult(result);

      if (result.success) {
        toast.success('RLS issues fixed! Try updating again.');
      } else {
        toast.error(`Fix attempt failed: ${result.message}`);
      }
    } catch (fixError) {
      console.error('Fix attempt failed:', fixError);
      setFixResult({
        success: false,
        message: fixError instanceof Error ? fixError.message : 'Unknown error',
        actions: ['Contact support for assistance']
      });
      toast.error('Failed to fix RLS issues');
    } finally {
      setIsAttemptingFix(false);
    }
  };

  const getDiagnosticStatus = (value: boolean | null): 'success' | 'error' | 'warning' => {
    if (value === null) return 'warning';
    return value ? 'success' : 'error';
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
  };

  return (
    <Alert className="border-destructive/50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Proforma Update Failed</AlertTitle>
      <AlertDescription className="space-y-4">
        <p className="text-sm">{error}</p>
        
        {error.includes('no data returned') || error.includes('permission') || error.includes('access') ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This usually happens due to permission issues. Click "Run Diagnostics" to check your access.
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                disabled={isRunningDiagnostics}
              >
                {isRunningDiagnostics ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Run Diagnostics
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={attemptFix}
                disabled={isAttemptingFix}
              >
                {isAttemptingFix ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wrench className="h-4 w-4 mr-2" />
                )}
                Auto-Fix RLS Policies
              </Button>

              {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}

              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>

            {fixResult && (
              <Card className={`border-muted ${fixResult.success ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Fix Attempt Result
                  </CardTitle>
                  <CardDescription>
                    {fixResult.message}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      {fixResult.success ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                      Actions Taken:
                    </h4>
                    <ul className="text-xs space-y-1">
                      {fixResult.actions.map((action, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {fixResult.success ? (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                      <div className="text-sm text-success flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Fix completed successfully! Try updating the proforma again.
                      </div>
                    </div>
                  ) : (
                    fixResult.message.includes('SQL generated') && (
                      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                        <div className="text-sm text-warning-foreground space-y-2">
                          <div className="flex items-center gap-2 font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            Manual Database Fix Required
                          </div>
                          <p>The RLS policies need to be updated manually in your database.</p>
                          <div className="mt-3">
                            <p className="font-medium mb-2">Instructions:</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs">
                              <li>Open your browser's developer console (F12)</li>
                              <li>Look for the SQL statements logged to console</li>
                              <li>Copy the SQL statements</li>
                              <li>Go to Supabase Dashboard → SQL Editor</li>
                              <li>Paste and run the SQL</li>
                              <li>Return here and try updating the proforma again</li>
                            </ol>
                          </div>
                          <div className="mt-3 p-2 bg-muted rounded text-xs font-mono">
                            The SQL is also saved in localStorage as 'proforma_rls_fix_sql'
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {diagnostics && (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Access Diagnostics
                  </CardTitle>
                  <CardDescription>
                    Checking your permissions and access to this proforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          User Authentication
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(getDiagnosticStatus(!!diagnostics.userId))}
                          <Badge variant={getDiagnosticStatus(!!diagnostics.userId) === 'success' ? 'default' : 'destructive'}>
                            {diagnostics.userId ? 'OK' : 'Failed'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          User Profile
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(getDiagnosticStatus(diagnostics.hasProfile))}
                          <Badge variant={getDiagnosticStatus(diagnostics.hasProfile) === 'success' ? 'default' : 'destructive'}>
                            {diagnostics.hasProfile ? 'Found' : 'Missing'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Company Access
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(getDiagnosticStatus(diagnostics.canAccessProforma))}
                          <Badge variant={getDiagnosticStatus(diagnostics.canAccessProforma) === 'success' ? 'default' : 'destructive'}>
                            {diagnostics.canAccessProforma ? 'Allowed' : 'Denied'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        <p><strong>User Company:</strong> {diagnostics.userCompanyId || 'None'}</p>
                        <p><strong>Proforma Company:</strong> {diagnostics.proformaCompanyId || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>

                  {diagnostics.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-destructive">Issues Found:</h4>
                      <ul className="text-xs space-y-1">
                        {diagnostics.errors.map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <XCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagnostics.errors.length === 0 && (
                    <div className="text-sm text-success flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      No permission issues detected
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* RLS Policy Information */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPolicyInfo(!showPolicyInfo)}
              >
                <Info className="h-4 w-4 mr-2" />
                {showPolicyInfo ? 'Hide' : 'Show'} RLS Policy Info
              </Button>

              {showPolicyInfo && (
                <Card className="border-muted bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-base">RLS Policy Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs font-mono space-y-1 text-muted-foreground">
                      {getRLSPolicyInfo().map((line, index) => (
                        <div key={index}>{line}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}

            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
