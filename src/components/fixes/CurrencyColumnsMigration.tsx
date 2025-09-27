import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Play, CheckCircle, Copy } from 'lucide-react';
import { runCurrencyMigration } from '@/utils/currencyMigration';
import { toast } from 'sonner';

export function CurrencyColumnsMigration() {
  const [manualSQL, setManualSQL] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const onRun = async () => {
    try {
      setRunning(true);
      setManualSQL(null);
      const res = await runCurrencyMigration();
      if (res.success) {
        setDone(true);
        toast.success('Currency migration completed');
      } else if (res.manualSQL) {
        setManualSQL(res.manualSQL);
        toast.info('Please run the SQL manually in Supabase SQL Editor');
      } else {
        toast.error(res.message || 'Migration failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Migration failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5"/> Currency Columns Migration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Adds currency_code, exchange_rate and fx_date to invoices (and best-effort to related tables). Default currency is KES.
        </p>
        <div className="flex gap-2">
          <Button onClick={onRun} disabled={running}>
            <Play className="h-4 w-4 mr-2"/>
            {running ? 'Running…' : 'Run Migration'}
          </Button>
          {done && (
            <span className="inline-flex items-center text-success text-sm"><CheckCircle className="h-4 w-4 mr-1"/> Completed</span>
          )}
        </div>
        {manualSQL && (
          <div className="space-y-2">
            <Alert>
              <AlertDescription>
                exec_sql RPC not available. Copy and run this SQL in Supabase SQL Editor, then try again.
              </AlertDescription>
            </Alert>
            <div className="relative">
              <Textarea value={manualSQL} readOnly className="h-64 font-mono"/>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => { navigator.clipboard.writeText(manualSQL); toast.success('SQL copied'); }}
              >
                <Copy className="h-4 w-4 mr-1"/> Copy SQL
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
