import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Search, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface CompanyAuditResult {
  total: number;
  withUsers: number;
  withoutUsers: number;
  duplicateNames: string[];
  missingData: Array<{ id: number; issue: string }>;
}

export function CompaniesTableAuditPanel() {
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [results, setResults] = React.useState<CompanyAuditResult | null>(null);
  const [lastAudit, setLastAudit] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const auditCompanies = async () => {
    setIsAuditing(true);
    setError(null);

    try {
      // Get all companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, email, phone');

      if (companiesError) {
        throw new Error(`Failed to fetch companies: ${companiesError.message}`);
      }

      // Check for users associated with companies
      const { data: users, error: usersError } = await supabase
        .from('auth.users')
        .select('user_metadata');

      const companyIds = companies?.map(c => c.id) || [];
      const companiesWithUsers = new Set();
      
      if (users) {
        users.forEach(user => {
          const companyId = user.user_metadata?.company_id;
          if (companyId && companyIds.includes(companyId)) {
            companiesWithUsers.add(companyId);
          }
        });
      }

      // Check for duplicate names
      const names = companies?.map(c => c.name?.toLowerCase()) || [];
      const duplicateNames = names.filter((name, index) => 
        name && names.indexOf(name) !== index
      );

      // Check for missing data
      const missingData = companies?.filter(company => 
        !company.name || !company.email
      ).map(company => ({
        id: company.id,
        issue: !company.name ? 'Missing name' : 'Missing email'
      })) || [];

      setResults({
        total: companies?.length || 0,
        withUsers: companiesWithUsers.size,
        withoutUsers: (companies?.length || 0) - companiesWithUsers.size,
        duplicateNames: [...new Set(duplicateNames)],
        missingData
      });

      setLastAudit(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setIsAuditing(false);
    }
  };

  React.useEffect(() => {
    auditCompanies();
  }, []);

  const hasIssues = results && (
    results.duplicateNames.length > 0 || 
    results.missingData.length > 0
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies Table Audit
          </div>
          <Button 
            onClick={auditCompanies} 
            variant="outline" 
            size="sm"
            disabled={isAuditing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'Auditing...' : 'Audit'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span>Total Companies:</span>
                  <Badge variant="outline">{results.total}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>With Users:</span>
                  <Badge variant="default">{results.withUsers}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Without Users:</span>
                  <Badge variant={results.withoutUsers > 0 ? 'secondary' : 'default'}>
                    {results.withoutUsers}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Issues Found:</span>
                  <Badge variant={hasIssues ? 'destructive' : 'default'}>
                    {(results.duplicateNames.length + results.missingData.length)}
                  </Badge>
                </div>
              </div>

              {lastAudit && (
                <div className="text-xs text-muted-foreground">
                  Last audit: {lastAudit.toLocaleString()}
                </div>
              )}

              {!hasIssues && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>No issues found in companies table</span>
                </div>
              )}

              {results.duplicateNames.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {results.duplicateNames.length} duplicate company names: {results.duplicateNames.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {results.missingData.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {results.missingData.length} companies with missing data
                  </AlertDescription>
                </Alert>
              )}

              {results.missingData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Companies with missing data:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {results.missingData.slice(0, 5).map((item, index) => (
                      <div key={index} className="text-sm border rounded p-2">
                        Company ID: {item.id} - {item.issue}
                      </div>
                    ))}
                    {results.missingData.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        ...and {results.missingData.length - 5} more issues
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
