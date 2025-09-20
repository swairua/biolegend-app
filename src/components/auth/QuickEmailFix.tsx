import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import { ADMIN_CREDENTIALS } from '@/utils/createStreamlinedSuperAdmin';
import { toast } from 'sonner';

interface QuickEmailFixProps {
  onRetry: () => void;
}

export function QuickEmailFix({ onRetry }: QuickEmailFixProps) {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(ADMIN_CREDENTIALS.email);
    setCopied(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/projects', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-xl text-red-700">Email Confirmation Blocking Sign-In</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quick 2-minute fix required in Supabase Dashboard
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>Admin email needs confirmation.</strong> Follow these exact steps to fix it immediately.
            </AlertDescription>
          </Alert>

          <div className="bg-white border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 text-center">
              🔧 Quick Fix (Takes 2 minutes)
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div>
                  <p className="text-sm font-medium">Step 1: Open Supabase Dashboard</p>
                  <p className="text-xs text-gray-600">Click the button to open in new tab</p>
                </div>
                <Button
                  onClick={openSupabase}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>

              <div className="p-3 bg-gray-50 rounded border">
                <p className="text-sm font-medium mb-2">Step 2: Navigate in dashboard</p>
                <ol className="text-sm space-y-1 text-gray-700">
                  <li>→ Select your project</li>
                  <li>→ Click "Authentication" in left sidebar</li>
                  <li>→ Click "Users" tab</li>
                </ol>
              </div>

              <div className="p-3 bg-gray-50 rounded border">
                <p className="text-sm font-medium mb-2">Step 3: Find admin user</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border flex-1">
                    {ADMIN_CREDENTIALS.email}
                  </code>
                  <Button
                    onClick={copyEmail}
                    size="sm"
                    variant="outline"
                    className="h-7"
                  >
                    {copied ? 'Copied!' : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Look for this email in the users list
                </p>
              </div>

              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-medium mb-2 text-green-800">Step 4: Confirm email</p>
                <ol className="text-sm space-y-1 text-green-700">
                  <li>→ Click on the admin user row</li>
                  <li>→ Click the "Confirm email" button</li>
                  <li>→ Come back here and click "Try Again"</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              After confirming the email in Supabase:
            </p>
            <Button
              onClick={onRetry}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              I've confirmed the email - Try signing in
            </Button>
          </div>

          <div className="border-t pt-4">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                Alternative: Disable email confirmation completely
              </summary>
              <div className="mt-2 p-3 bg-blue-50 rounded text-blue-700">
                <p className="font-medium mb-1">Instead of confirming individual emails:</p>
                <ol className="text-sm space-y-1">
                  <li>1. In Supabase Dashboard → Authentication → Settings</li>
                  <li>2. Find "Email Auth" section</li>
                  <li>3. Turn OFF "Enable email confirmations"</li>
                  <li>4. Save and refresh this page</li>
                </ol>
                <p className="text-xs mt-2 opacity-75">
                  This disables email confirmation for all future users
                </p>
              </div>
            </details>
          </div>

          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>Need to sign in with:</p>
            <p>📧 {ADMIN_CREDENTIALS.email}</p>
            <p>🔑 {ADMIN_CREDENTIALS.password}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
