import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AuthTest() {
  const { user, isAuthenticated, loading } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Authentication Test</h1>
        <p className="text-muted-foreground">
          Test and verify authentication system functionality
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Loading State:</span>
              <Badge variant={loading ? 'secondary' : 'outline'}>
                {loading ? 'Loading...' : 'Ready'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Authentication:</span>
              <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
                {isAuthenticated ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Authenticated
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Authenticated
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>User Present:</span>
              <Badge variant={user ? 'default' : 'secondary'}>
                {user ? (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Yes
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    No
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <div>
                  <span className="font-medium">ID:</span>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <span className="font-medium">Role:</span>
                  <p className="text-sm text-muted-foreground">
                    {user.user_metadata?.role || 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Last Sign In:</span>
                  <p className="text-sm text-muted-foreground">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No user data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Refresh Auth State
            </Button>
            <Button 
              variant="outline"
              onClick={() => console.log('Auth Context:', { user, isAuthenticated, loading })}
            >
              Log Auth Data
            </Button>
            <Button 
              variant="outline"
              onClick={() => localStorage.clear()}
            >
              Clear Local Storage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthTest;
