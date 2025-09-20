import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Database, User, Copy, RefreshCw } from 'lucide-react';
import { getDatabaseStatus } from '@/utils/setupDatabase';
import { createSuperAdmin } from '@/utils/createSuperAdmin';
import { ManualSQLSetup } from '@/components/ManualSQLSetup';
import { toast } from 'sonner';

export function DatabaseInitializer() {
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState<any>(null);
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);

  const checkDatabaseStatus = async () => {
    try {
      const status = await getDatabaseStatus();
      setDatabaseStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking database status:', error);
      return null;
    }
  };

  const createAdminUser = async () => {
    setIsCreatingAdmin(true);
    try {
      console.log('👤 Creating super admin user...');
      toast.info('Creating super admin account...');
      
      const result = await createSuperAdmin();
      
      if (result.success) {
        setAdminCreated(true);
        setAdminCredentials(result.credentials);
        toast.success('Super admin created successfully!');
      } else {
        toast.error(`Admin creation failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Admin creation failed:', error);
      toast.error('Admin creation failed');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Auto-check database status on component mount
  React.useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Manual SQL Setup */}
      <ManualSQLSetup />


      {/* Admin Creation */}
      {!adminCreated && databaseStatus?.ready && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create Super Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Create the first administrator account to manage the system.
              </p>
              
              <Button
                onClick={createAdminUser}
                disabled={isCreatingAdmin}
                className="w-full"
                size="lg"
              >
                {isCreatingAdmin ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating Admin...
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Create Super Admin
                  </>
                )}
              </Button>

              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Having trouble?</strong> If you get an "email not confirmed" error,{' '}
                  <a
                    href="/email-confirmation"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    click here for help
                  </a>.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Credentials */}
      {adminCreated && adminCredentials && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700">🔐 Super Admin Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Save these credentials:</strong> You'll need them to sign in to the system.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-white border rounded">
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="font-mono text-sm">{adminCredentials.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(adminCredentials.email, 'Email')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white border rounded">
                <div>
                  <label className="text-xs font-medium text-gray-500">Password</label>
                  <p className="font-mono text-sm">{adminCredentials.password}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(adminCredentials.password, 'Password')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button
                onClick={() => window.location.href = '/'}
                className="w-full"
                size="lg"
              >
                Go to Dashboard & Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {adminCreated && databaseStatus?.ready && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">🎉 Setup Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-white">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Excellent! Your database has been initialized and your super admin account is ready.
                You can now sign in and start using all features of the MedPlus system.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
