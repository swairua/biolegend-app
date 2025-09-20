import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export function CreditNotesConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = useState<{
    tablesExist: boolean;
    schemaCorrect: boolean;
    canCreate: boolean;
    error?: string;
    testing: boolean;
  }>({
    tablesExist: false,
    schemaCorrect: false,
    canCreate: false,
    testing: true
  });

  const checkCreditNotesSetup = async () => {
    setConnectionStatus(prev => ({ ...prev, testing: true }));

    try {
      // Test 1: Check if credit_notes table exists
      const { error: creditNotesError } = await supabase
        .from('credit_notes')
        .select('id')
        .limit(0);

      const tablesExist = !creditNotesError;

      // Test 2: Check if the schema has the correct fields
      let schemaCorrect = false;
      if (tablesExist) {
        try {
          const { error: schemaError } = await supabase
            .from('credit_note_items')
            .select('tax_percentage, tax_inclusive, tax_setting_id')
            .limit(0);
          
          schemaCorrect = !schemaError;
        } catch (err) {
          schemaCorrect = false;
        }
      }

      // Test 3: Check if we can potentially create credit notes
      let canCreate = false;
      if (tablesExist && schemaCorrect) {
        try {
          const { error: accessError } = await supabase
            .from('customers')
            .select('id')
            .limit(1);
          
          canCreate = !accessError;
        } catch (err) {
          canCreate = false;
        }
      }

      setConnectionStatus({
        tablesExist,
        schemaCorrect,
        canCreate,
        testing: false,
        error: tablesExist ? undefined : 'Credit notes tables not found'
      });

    } catch (error: any) {
      setConnectionStatus({
        tablesExist: false,
        schemaCorrect: false,
        canCreate: false,
        testing: false,
        error: error.message
      });
    }
  };

  useEffect(() => {
    checkCreditNotesSetup();
  }, []);

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="text-xs">
        {status ? '✅' : '❌'} {label}
      </Badge>
    );
  };

  if (connectionStatus.testing) {
    return (
      <Alert>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Checking credit notes setup...
        </AlertDescription>
      </Alert>
    );
  }

  if (connectionStatus.tablesExist && connectionStatus.schemaCorrect && connectionStatus.canCreate) {
    return (
      <Alert className="border-success/20 bg-success-light/10">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-success-foreground">
          <strong>✅ Credit Notes Ready!</strong><br />
          All tables exist with correct schema. You can create credit notes.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-warning/20 bg-warning-light/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription>
        <div className="space-y-2">
          <div><strong>Credit Notes Setup Status:</strong></div>
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(connectionStatus.tablesExist, 'Tables')}
            {getStatusBadge(connectionStatus.schemaCorrect, 'Schema')}
            {getStatusBadge(connectionStatus.canCreate, 'Access')}
          </div>
          {connectionStatus.error && (
            <div className="text-sm text-muted-foreground">
              Issue: {connectionStatus.error}
            </div>
          )}
          <div className="flex items-center space-x-2 mt-2">
            <Button variant="outline" size="sm" onClick={checkCreditNotesSetup}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Recheck
            </Button>
            {!connectionStatus.tablesExist && (
              <span className="text-xs text-muted-foreground">
                Run the migration SQL to set up credit notes
              </span>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
