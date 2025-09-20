import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
  Settings,
  Users,
  Mail,
  Shield
} from 'lucide-react';
import { EmailLoginConfigGuide } from './EmailLoginConfigGuide';
import { toast } from 'sonner';

export function SupabaseConfigGuide() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNumber);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase Dashboard. Navigate to your project.');
  };

  const adminCredentials = {
    email: 'admin@biolegendscientific.co.ke',
    password: 'Biolegend2024!Admin'
  };

  const manualUserSQL = `-- Create admin user manually in SQL Editor
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@biolegendscientific.co.ke',
  crypt('Biolegend2024!Admin', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- Create profile for the admin user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  status,
  department,
  position,
  created_at,
  updated_at
) 
SELECT 
  id,
  'admin@biolegendscientific.co.ke',
  'System Administrator',
  'admin',
  'active',
  'Administration',
  'System Administrator',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'admin@biolegendscientific.co.ke';`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase Configuration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Problem Explanation */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>❌ Email authentication is disabled</strong></p>
                <p>Your Supabase project has email/password authentication disabled, preventing user login.</p>
                <p>This could be either "Email signups disabled" or "Email logins disabled".</p>
                <p>Choose one of the solutions below to resolve this issue.</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Quick Action */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
            <div>
              <h3 className="font-medium">Quick Fix: Open Supabase Dashboard</h3>
              <p className="text-sm text-muted-foreground">Navigate to your project settings to enable signups</p>
            </div>
            <Button onClick={openSupabaseDashboard} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Dashboard
            </Button>
          </div>

          {/* Email Login Specific Guide */}
          <EmailLoginConfigGuide />

          {/* Solution 1: Enable Email Signups */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Alternative</Badge>
              <h3 className="text-lg font-semibold">Alternative: General Email Authentication Steps</h3>
            </div>

            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong>Follow these steps in your Supabase Dashboard:</strong></p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      <div className="flex items-center justify-between">
                        <span>Go to <strong>Authentication → Settings</strong></span>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between">
                        <span>Find <strong>"Email"</strong> provider in the providers list</span>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between">
                        <span><strong>ENABLE</strong> the Email provider</span>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between">
                        <span>Set "Enable email confirmations" to <strong>OFF</strong> (temporarily)</span>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between">
                        <span>Save settings and return to login page</span>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between">
                        <span>Try logging in again with admin credentials</span>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between">
                        <span>Re-enable email confirmations after successful login</span>
                      </div>
                    </li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Solution 2: Manual User Creation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">Advanced</Badge>
              <h3 className="text-lg font-semibold">Solution 2: Create Admin User Manually</h3>
            </div>
            
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong>Create admin user directly in database:</strong></p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to <strong>SQL Editor</strong> in Supabase Dashboard</li>
                    <li>Copy and run the SQL script below</li>
                    <li>Return to login and sign in with admin credentials</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">SQL Script</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(manualUserSQL, 1)}
                  className="flex items-center gap-2"
                >
                  {copiedStep === 1 ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy SQL
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-lg max-h-64 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {manualUserSQL}
                </pre>
              </div>
            </div>
          </div>

          {/* Solution 3: Manual User via Dashboard */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800">Alternative</Badge>
              <h3 className="text-lg font-semibold">Solution 3: Create User via Dashboard</h3>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong>Create user manually through Supabase interface:</strong></p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to <strong>Authentication → Users</strong></li>
                    <li>Click <strong>"Add user"</strong> or <strong>"Invite user"</strong></li>
                    <li>
                      <div className="flex items-center justify-between mt-2">
                        <span>Email: <code className="bg-muted px-1 rounded">{adminCredentials.email}</code></span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(adminCredentials.email, 2)}
                        >
                          {copiedStep === 2 ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between mt-2">
                        <span>Password: <code className="bg-muted px-1 rounded">{adminCredentials.password}</code></span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(adminCredentials.password, 3)}
                        >
                          {copiedStep === 3 ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </li>
                    <li>Set <strong>Auto Confirm User</strong> to <strong>true</strong></li>
                    <li>Click <strong>"Create user"</strong></li>
                    <li>Return to login page and sign in</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Admin Credentials */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Admin Login Credentials</h3>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span><strong>Email:</strong> {adminCredentials.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(adminCredentials.email, 4)}
                    >
                      {copiedStep === 4 ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span><strong>Password:</strong> {adminCredentials.password}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(adminCredentials.password, 5)}
                    >
                      {copiedStep === 5 ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Next Steps */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>After completing any solution above:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Return to the login page</li>
                  <li>Use the admin credentials above to sign in</li>
                  <li>If solution 1 was used, re-enable email confirmations in Supabase settings</li>
                  <li>Test the application functionality</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
