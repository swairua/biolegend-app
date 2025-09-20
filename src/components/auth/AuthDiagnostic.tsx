import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Building, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticData {
  user: any;
  profile: any;
  companies: any[];
  userCompanyId: string | null;
  hasProfile: boolean;
  hasCompany: boolean;
  companiesCount: number;
}

export const AuthDiagnostic = () => {
  const { user, profile } = useAuth();
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser?.id)
        .maybeSingle();

      // Get all companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*');

      const result: DiagnosticData = {
        user: currentUser,
        profile: userProfile,
        companies: companies || [],
        userCompanyId: userProfile?.company_id || null,
        hasProfile: !!userProfile,
        hasCompany: !!userProfile?.company_id,
        companiesCount: companies?.length || 0
      };

      setDiagnostic(result);

      console.log('Auth Diagnostic Results:', result);

    } catch (error) {
      console.error('Diagnostic failed:', error);
      toast.error('Failed to run diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const fixProfile = async () => {
    if (!diagnostic?.user) {
      toast.error('No user found');
      return;
    }

    try {
      // Get first company or create one
      let targetCompanyId = diagnostic.companies[0]?.id;
      
      if (!targetCompanyId) {
        // Create a default company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([{
            name: 'Default Company',
            address: 'Default Address',
            phone: '000-000-0000',
            email: 'admin@company.com'
          }])
          .select()
          .single();

        if (companyError) {
          toast.error('Failed to create company');
          return;
        }

        targetCompanyId = newCompany.id;
      }

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: diagnostic.user.id,
          email: diagnostic.user.email,
          company_id: targetCompanyId,
          full_name: diagnostic.user.user_metadata?.full_name || diagnostic.user.email?.split('@')[0] || 'User',
          role: 'admin'
        }])
        .select()
        .single();

      if (profileError) {
        toast.error('Failed to fix profile');
        return;
      }

      toast.success('Profile fixed! Please refresh the page.');
      runDiagnostic(); // Re-run diagnostic

    } catch (error) {
      console.error('Fix failed:', error);
      toast.error('Failed to fix profile');
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  if (!diagnostic && loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Running diagnostics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Auth Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {diagnostic && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Authentication
                  </span>
                  <Badge variant={diagnostic.user ? 'default' : 'destructive'}>
                    {diagnostic.user ? 'OK' : 'Missing'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Profile
                  </span>
                  <Badge variant={diagnostic.hasProfile ? 'default' : 'destructive'}>
                    {diagnostic.hasProfile ? 'Found' : 'Missing'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company Assignment
                  </span>
                  <Badge variant={diagnostic.hasCompany ? 'default' : 'destructive'}>
                    {diagnostic.hasCompany ? 'Assigned' : 'Missing'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Companies in System
                  </span>
                  <Badge variant={diagnostic.companiesCount > 0 ? 'default' : 'destructive'}>
                    {diagnostic.companiesCount}
                  </Badge>
                </div>
              </div>

              <div className="text-sm space-y-2">
                <div>
                  <strong>User ID:</strong> {diagnostic.user?.id || 'None'}
                </div>
                <div>
                  <strong>Email:</strong> {diagnostic.user?.email || 'None'}
                </div>
                <div>
                  <strong>Company ID:</strong> {diagnostic.userCompanyId || 'None'}
                </div>
                <div>
                  <strong>Profile Role:</strong> {diagnostic.profile?.role || 'None'}
                </div>
              </div>
            </div>

            {(!diagnostic.hasProfile || !diagnostic.hasCompany || diagnostic.companiesCount === 0) && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2">Issues Found:</h4>
                <ul className="text-sm space-y-1">
                  {!diagnostic.hasProfile && (
                    <li>• User profile is missing from database</li>
                  )}
                  {!diagnostic.hasCompany && (
                    <li>• User profile has no company assigned</li>
                  )}
                  {diagnostic.companiesCount === 0 && (
                    <li>• No companies exist in the system</li>
                  )}
                </ul>
                <Button
                  className="mt-3"
                  onClick={fixProfile}
                  variant="destructive"
                >
                  Fix Issues Automatically
                </Button>
              </div>
            )}

            {diagnostic.hasProfile && diagnostic.hasCompany && diagnostic.companiesCount > 0 && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">All checks passed!</span>
                </div>
                <p className="text-sm mt-1">
                  Your profile should have access to proforma functionality.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={runDiagnostic} variant="outline" disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Re-run Diagnostic
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
