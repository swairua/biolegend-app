import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Mail,
  Key,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export function EmailLoginConfigGuide() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNumber);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase Dashboard. Navigate to Authentication settings.');
  };

  const adminCredentials = {
    email: 'admin@biolegendscientific.co.ke',
    password: 'Biolegend2024!Admin'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Login Configuration Fix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Explanation */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>❌ Email logins are disabled</strong></p>
                <p>Your Supabase project has the Email authentication provider disabled.</p>
                <p>This prevents all email/password login attempts, including admin login.</p>
                <p><strong>Impact:</strong> Cannot sign in with email and password</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Quick Fix Button */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
            <div>
              <h3 className="font-medium">Quick Access: Supabase Authentication Settings</h3>
              <p className="text-sm text-muted-foreground">Open your project's authentication configuration</p>
            </div>
            <Button onClick={openSupabaseDashboard} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Settings
            </Button>
          </div>

          {/* Step-by-Step Fix */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">Critical Fix</Badge>
              <h3 className="text-lg font-semibold">Enable Email Authentication Provider</h3>
            </div>
            
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong>Follow these exact steps in Supabase Dashboard:</strong></p>
                  <div className="bg-white border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</div>
                      <div className="flex-1">
                        <p className="font-medium">Navigate to Authentication Settings</p>
                        <p className="text-sm text-muted-foreground">Go to <strong>Authentication → Settings</strong> in your Supabase dashboard</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</div>
                      <div className="flex-1">
                        <p className="font-medium">Find Authentication Providers</p>
                        <p className="text-sm text-muted-foreground">Look for the <strong>"Auth Providers"</strong> section</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</div>
                      <div className="flex-1">
                        <p className="font-medium">Enable Email Provider</p>
                        <p className="text-sm text-muted-foreground">Find <strong>"Email"</strong> and toggle it <strong>ON</strong></p>
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <strong>Critical:</strong> The Email provider must be enabled for login to work
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">4</div>
                      <div className="flex-1">
                        <p className="font-medium">Configure Email Settings</p>
                        <p className="text-sm text-muted-foreground">Set <strong>"Enable email confirmations"</strong> to <strong>OFF</strong> (temporarily)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">5</div>
                      <div className="flex-1">
                        <p className="font-medium">Save and Test</p>
                        <p className="text-sm text-muted-foreground">Click <strong>"Save"</strong> and return to login page to test</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Visual Guide */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What You're Looking For</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Key className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2 text-blue-700">
                    <p className="font-medium">Auth Providers Section</p>
                    <ul className="text-sm space-y-1">
                      <li>• Look for "Email" provider</li>
                      <li>• Should have a toggle switch</li>
                      <li>• Currently shows as "Disabled"</li>
                      <li>• Need to turn it "ON"</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert className="border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-2 text-green-700">
                    <p className="font-medium">Email Configuration</p>
                    <ul className="text-sm space-y-1">
                      <li>• "Enable email confirmations": OFF</li>
                      <li>• "Allow disposable email": Either</li>
                      <li>• "Double confirm email changes": Either</li>
                      <li>• "Secure email change": Either</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Admin Credentials */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Admin Login Credentials</h3>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Use these credentials after enabling email authentication:</strong></p>
                  <div className="flex items-center justify-between">
                    <span><strong>Email:</strong> {adminCredentials.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(adminCredentials.email, 1)}
                    >
                      {copiedStep === 1 ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span><strong>Password:</strong> {adminCredentials.password}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(adminCredentials.password, 2)}
                    >
                      {copiedStep === 2 ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Troubleshooting */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Troubleshooting</h3>
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="space-y-2 text-yellow-700">
                  <p><strong>If you still can't find the Email provider:</strong></p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Make sure you're in the correct Supabase project</li>
                    <li>Check you have admin access to the project</li>
                    <li>Try refreshing the Supabase dashboard</li>
                    <li>Look for "Auth" or "Authentication" in the sidebar</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Success Steps */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>After enabling email authentication:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Return to the login page</li>
                  <li>Use the admin credentials above</li>
                  <li>Click "Sign In" to test the login</li>
                  <li>You should be able to access the application</li>
                  <li>(Optional) Re-enable email confirmations later for security</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
