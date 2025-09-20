import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Search, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface AuditResult {
  table: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  count?: number;
}

export function DatabaseAuditPanel() {
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [results, setResults] = React.useState<AuditResult[]>([]);
  const [lastAudit, setLastAudit] = React.useState<Date | null>(null);

  const auditTables = async () => {
    setIsAuditing(true);
    const auditResults: AuditResult[] = [];

    try {
      // Check critical tables
      const tables = ['companies', 'customers', 'products', 'invoices', 'payments'];
      
      for (const table of tables) {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) {
            auditResults.push({
              table,
              status: 'error',
              message: `Error accessing table: ${error.message}`,
            });
          } else {
            auditResults.push({
              table,
              status: 'ok',
              message: 'Table accessible',
              count: count || 0,
            });
          }
        } catch (err) {
          auditResults.push({
            table,
            status: 'error',
            message: `Failed to audit table: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      }

      setResults(auditResults);
      setLastAudit(new Date());
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  React.useEffect(() => {
    auditTables();
  }, []);

  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Audit Panel
          </div>
          <Button 
            onClick={auditTables} 
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
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span>Total Tables:</span>
              <Badge variant="outline">{results.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Errors:</span>
              <Badge variant={errorCount > 0 ? 'destructive' : 'default'}>
                {errorCount}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Warnings:</span>
              <Badge variant={warningCount > 0 ? 'secondary' : 'default'}>
                {warningCount}
              </Badge>
            </div>
          </div>

          {lastAudit && (
            <div className="text-xs text-muted-foreground">
              Last audit: {lastAudit.toLocaleString()}
            </div>
          )}

          {errorCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorCount} table(s) have errors that need attention.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.table}</span>
                    <Badge 
                      variant={
                        result.status === 'ok' ? 'default' :
                        result.status === 'warning' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {result.status === 'ok' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {result.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {result.status}
                    </Badge>
                  </div>
                  {result.count !== undefined && (
                    <Badge variant="outline">{result.count} records</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {result.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
