import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Shield, 
  LogIn, 
  LogOut, 
  CheckCircle, 
  AlertCircle,
  Mail,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

export function LoginTest() {
  const { 
    user, 
    profile, 
    isAuthenticated, 
    loading, 
    signIn, 
    signOut 
  } = useAuth();
  
  const [testCredentials, setTestCredentials] = useState({
    email: '',
    password: ''
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCredentials.email || !testCredentials.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { error } = await signIn(testCredentials.email, testCredentials.password);
      if (!error) {
        toast.success('✅ Login test successful!');
      }
    } catch (error) {
      toast.error('❌ Login test failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTestLogout = async () => {
    try {
      await signOut();
      toast.success('✅ Logout test successful!');
    } catch (error) {
      toast.error('❌ Logout test failed');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'accountant': return 'bg-blue-100 text-blue-800';
      case 'stock_manager': return 'bg-orange-100 text-orange-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Test Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>✅ Supabase Connected</strong><br />
              URL: https://mfhcbgnkxpifbhrtmgbv.supabase.co<br />
              Key: ...{process.env.VITE_SUPABASE_ANON_KEY?.slice(-10) || 'configured'}
            </AlertDescription>
          </Alert>

          {/* Current Auth State */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Authentication State</h3>
            
            {loading ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Loading authentication state...</AlertDescription>
              </Alert>
            ) : isAuthenticated ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div><strong>✅ User Authenticated</strong></div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{user?.email}</span>
                    </div>
                    {profile && (
                      <>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{profile.full_name || 'No name set'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleColor(profile.role)}>
                            {profile.role}
                          </Badge>
                          <Badge className={getStatusColor(profile.status)}>
                            {profile.status}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>❌ Not Authenticated</strong><br />
                  Please log in to test the authentication system.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Login Test Form */}
          {!isAuthenticated && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Login</h3>
              <form onSubmit={handleTestLogin} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Email</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="Enter test email"
                      value={testCredentials.email}
                      onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
                      disabled={isLoggingIn}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-password">Password</Label>
                    <Input
                      id="test-password"
                      type="password"
                      placeholder="Enter test password"
                      value={testCredentials.password}
                      onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoggingIn || !testCredentials.email || !testCredentials.password}
                  className="w-full"
                >
                  {isLoggingIn ? (
                    <>
                      <Lock className="h-4 w-4 mr-2 animate-spin" />
                      Testing Login...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Test Login
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Logout Test */}
          {isAuthenticated && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Logout</h3>
              <Button 
                onClick={handleTestLogout}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Test Logout
              </Button>
            </div>
          )}

          {/* Test Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Instructions</h3>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>To test authentication:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Enter valid user credentials in the form above</li>
                    <li>Click "Test Login" to authenticate</li>
                    <li>Verify that user profile and permissions load correctly</li>
                    <li>Test logout functionality</li>
                    <li>Try accessing protected routes</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    If you need to create test users, contact your administrator or use the database setup tools.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
