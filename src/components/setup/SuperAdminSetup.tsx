import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Mail, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { setupSuperAdmin, SUPER_ADMIN_CREDENTIALS } from '@/utils/createSuperAdmin';
import { toast } from 'sonner';

export function SuperAdminSetup() {
  const [isCreating, setIsCreating] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const handleCreateSuperAdmin = async () => {
    setIsCreating(true);
    
    try {
      const result = await setupSuperAdmin();
      
      if (result.success) {
        setSetupComplete(true);
        setShowCredentials(true);
        toast.success('Super admin created successfully!');
      } else {
        toast.error(`Setup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('An unexpected error occurred during setup');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <span>Super Admin Setup</span>
          {setupComplete && (
            <Badge variant="outline" className="bg-success-light text-success border-success/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Create the first administrator account to manage the MedPlus system. This account will have full access to all features.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!setupComplete ? (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will create a super administrator account with full system access. 
                This should only be done once during initial system setup.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What will be created:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email: admin@medplusafrica.com</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Secure password with full admin permissions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Access to all system features and user management</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleCreateSuperAdmin}
              disabled={isCreating}
              className="w-full"
              size="lg"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Super Admin...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Create Super Admin
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-6">
            <Alert className="border-success bg-success-light">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Super admin account has been created successfully!
              </AlertDescription>
            </Alert>

            {showCredentials && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-destructive">
                  🔐 Super Admin Credentials
                </h3>
                
                <Alert className="border-destructive bg-destructive-light">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    <strong>IMPORTANT:</strong> Save these credentials securely and change the password after first login!
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="font-mono text-sm">{SUPER_ADMIN_CREDENTIALS.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(SUPER_ADMIN_CREDENTIALS.email, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Password</label>
                      <p className="font-mono text-sm">{SUPER_ADMIN_CREDENTIALS.password}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(SUPER_ADMIN_CREDENTIALS.password, 'Password')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <h4 className="font-medium mb-2">Next Steps:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Sign in using the credentials above</li>
                    <li>2. Change the password immediately after first login</li>
                    <li>3. Set up your company information</li>
                    <li>4. Create additional user accounts as needed</li>
                  </ul>

                  <Button
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                    size="lg"
                  >
                    Go to Dashboard & Sign In
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
