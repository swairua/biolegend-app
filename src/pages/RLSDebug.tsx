import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Search, 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  User,
  Building,
  FileText
} from 'lucide-react';
import { ProformaUpdateErrorHandler } from '@/components/proforma/ProformaUpdateErrorHandler';
import { RLSTroubleshootingGuide } from '@/components/proforma/RLSTroubleshootingGuide';
import { diagnoseProformaRLS, type RLSDiagnostics } from '@/utils/rlsDiagnostics';
import { attemptRLSFix, ensureUserProfile, type RLSFixResult } from '@/utils/rlsFixer';
import { useProformas } from '@/hooks/useProforma';
import { useCompanies } from '@/hooks/useDatabase';
import { toast } from 'sonner';

export default function RLSDebug() {
  const [proformaId, setProformaId] = useState('');
  const [diagnostics, setDiagnostics] = useState<RLSDiagnostics | null>(null);
  const [fixResult, setFixResult] = useState<RLSFixResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: companies } = useCompanies();
  const { data: proformas } = useProformas(companies?.[0]?.id);

  const runDiagnostics = async () => {
    if (!proformaId.trim()) {
      toast.error('Please enter a proforma ID');
      return;
    }

    setIsRunning(true);
    try {
      const result = await diagnoseProformaRLS(proformaId.trim());
      setDiagnostics(result);
      toast.success('Diagnostics completed');
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast.error('Diagnostics failed');
    } finally {
      setIsRunning(false);
    }
  };

  const runFix = async () => {
    if (!proformaId.trim()) {
      toast.error('Please enter a proforma ID');
      return;
    }

    setIsRunning(true);
    try {
      const result = await attemptRLSFix(proformaId.trim());
      setFixResult(result);
      
      if (result.success) {
        toast.success('Fix completed successfully');
        // Re-run diagnostics to see the changes
        const newDiagnostics = await diagnoseProformaRLS(proformaId.trim());
        setDiagnostics(newDiagnostics);
      } else {
        toast.error('Fix failed');
      }
    } catch (error) {
      console.error('Fix failed:', error);
      toast.error('Fix attempt failed');
    } finally {
      setIsRunning(false);
    }
  };

  const checkProfile = async () => {
    setIsRunning(true);
    try {
      const result = await ensureUserProfile();
      setFixResult(result);
      
      if (result.success) {
        toast.success('Profile check passed');
      } else {
        toast.warning('Profile issues detected');
      }
    } catch (error) {
      console.error('Profile check failed:', error);
      toast.error('Profile check failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          RLS Debug Tool
        </h1>
        <p className="text-muted-foreground">
          Diagnose and fix Row Level Security permission issues for proforma invoices
        </p>
      </div>

      {/* Quick Profile Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Quick Profile Check
          </CardTitle>
          <CardDescription>
            Check if your user profile is properly configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkProfile} disabled={isRunning}>
            <User className="h-4 w-4 mr-2" />
            Check My Profile
          </Button>
        </CardContent>
      </Card>

      {/* Proforma Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proforma Diagnostics
          </CardTitle>
          <CardDescription>
            Enter a proforma ID to diagnose access issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="proforma-id">Proforma ID</Label>
              <Input
                id="proforma-id"
                placeholder="Enter proforma ID (UUID)"
                value={proformaId}
                onChange={(e) => setProformaId(e.target.value)}
              />
            </div>
            <Button onClick={runDiagnostics} disabled={isRunning || !proformaId.trim()}>
              <Search className="h-4 w-4 mr-2" />
              Diagnose
            </Button>
            <Button onClick={runFix} disabled={isRunning || !proformaId.trim()} variant="default">
              <Wrench className="h-4 w-4 mr-2" />
              Attempt Fix
            </Button>
          </div>

          {/* Available Proformas */}
          {proformas && proformas.length > 0 && (
            <div className="space-y-2">
              <Label>Available Proformas (click to use):</Label>
              <div className="flex flex-wrap gap-2">
                {proformas.slice(0, 5).map((proforma) => (
                  <Button
                    key={proforma.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setProformaId(proforma.id)}
                    className="text-xs"
                  >
                    {proforma.proforma_number}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostics Results */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Diagnostics Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">User ID</span>
                <Badge variant={diagnostics.userId ? 'default' : 'destructive'}>
                  {diagnostics.userId ? 'OK' : 'Missing'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Profile</span>
                <Badge variant={diagnostics.hasProfile ? 'default' : 'destructive'}>
                  {diagnostics.hasProfile ? 'Found' : 'Missing'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Access</span>
                <Badge variant={diagnostics.canAccessProforma ? 'default' : 'destructive'}>
                  {diagnostics.canAccessProforma ? 'Allowed' : 'Denied'}
                </Badge>
              </div>
            </div>

            <div className="text-sm space-y-1">
              <p><strong>User Company:</strong> {diagnostics.userCompanyId || 'None'}</p>
              <p><strong>Proforma Company:</strong> {diagnostics.proformaCompanyId || 'Unknown'}</p>
            </div>

            {diagnostics.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Issues Found</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {diagnostics.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {diagnostics.errors.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>No Issues Detected</AlertTitle>
                <AlertDescription>
                  All permissions look correct. If you're still having issues, try updating the proforma directly.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fix Results */}
      {fixResult && (
        <Card className={fixResult.success ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Fix Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {fixResult.success ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">{fixResult.message}</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Actions Taken:</h4>
              <ul className="space-y-1">
                {fixResult.actions.map((action, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Handler Demo */}
      {proformaId && diagnostics && diagnostics.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Handler Preview</CardTitle>
            <CardDescription>
              This is how the error would appear in the proforma edit modal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProformaUpdateErrorHandler
              error="Update returned no data for proforma - likely RLS issue"
              proformaId={proformaId}
              onRetry={() => toast.info('Retry clicked')}
              onDismiss={() => toast.info('Dismiss clicked')}
            />
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Guide */}
      <RLSTroubleshootingGuide />
    </div>
  );
}
