import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Database, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Eye,
  RefreshCw,
  Loader
} from 'lucide-react';
import { 
  runLegacyUsdMigration, 
  getLegacyUsdRecordCount,
  getPreviewRecords,
  MigrationResult 
} from '@/utils/legacyUsdMigration';
import { toast } from 'sonner';

interface PreviewRecord {
  id: string;
  invoice_number?: string;
  quotation_number?: string;
  currency_code: string | null;
  exchange_rate: number | null;
  fx_date: string | null;
  created_at: string;
}

export function LegacyUsdMigration() {
  const [legacyCount, setLegacyCount] = useState<number | null>(null);
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [running, setRunning] = useState(false);
  const [dryRunMode, setDryRunMode] = useState(true);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Load legacy record count on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const count = await getLegacyUsdRecordCount();
        setLegacyCount(count);
      } catch (err: any) {
        console.error('Error loading legacy count:', err);
        toast.error('Failed to load legacy record count');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLoadPreview = async () => {
    try {
      const records = await getPreviewRecords(5);
      setPreviewRecords(records as PreviewRecord[]);
      setShowPreview(true);
    } catch (err: any) {
      toast.error('Failed to load preview records');
    }
  };

  const handleRunDryRun = async () => {
    try {
      setRunning(true);
      setResult(null);
      const migrationResult = await runLegacyUsdMigration(true);
      setResult(migrationResult);
      if (migrationResult.success) {
        toast.success(`Dry-run complete: ${migrationResult.affected_count} records ready`);
      } else {
        toast.error(migrationResult.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Dry-run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleRunMigration = async () => {
    if (!confirm('This will update legacy USD invoice and quotation metadata. Ensure you have a backup first. Continue?')) {
      return;
    }

    try {
      setRunning(true);
      setResult(null);
      const migrationResult = await runLegacyUsdMigration(false);
      setResult(migrationResult);
      
      // Reload count after migration
      const newCount = await getLegacyUsdRecordCount();
      setLegacyCount(newCount);

      if (migrationResult.success) {
        toast.success(`Migration complete: ${migrationResult.affected_count} records updated`);
      } else {
        toast.error(migrationResult.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Migration failed');
    } finally {
      setRunning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Legacy USD Invoice & Quotation Migration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Overview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Backfills currency metadata (exchange_rate, fx_date) for legacy USD invoices and quotations.
            Records are identified by currency_code = 'USD' with missing or null exchange_rate/fx_date.
          </p>
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 ml-2">
              <strong>Recommendation:</strong> Backup your Supabase database before running the live migration.
            </AlertDescription>
          </Alert>
        </div>

        {/* Status */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Status</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
              Loading record count...
            </div>
          ) : legacyCount === null ? (
            <div className="text-sm text-destructive">Unable to load legacy record count</div>
          ) : legacyCount === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              No legacy USD records found. All records are up to date.
            </div>
          ) : (
            <div className="text-sm">
              <span className="font-semibold text-destructive">{legacyCount}</span>
              <span className="text-muted-foreground ml-2">records need backfill</span>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {legacyCount && legacyCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Preview</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadPreview}
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
                Load Sample Records
              </Button>
            </div>

            {showPreview && previewRecords.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Number</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Exchange Rate</TableHead>
                      <TableHead>FX Date</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono">
                          {record.invoice_number || record.quotation_number || 'N/A'}
                        </TableCell>
                        <TableCell>{record.currency_code || 'NULL'}</TableCell>
                        <TableCell>
                          {record.exchange_rate ? (
                            <span>{record.exchange_rate.toFixed(2)}</span>
                          ) : (
                            <span className="text-destructive font-medium">NULL</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.fx_date ? (
                            <span>{formatDate(record.fx_date)}</span>
                          ) : (
                            <span className="text-destructive font-medium">NULL</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(record.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Migration Controls */}
        {legacyCount && legacyCount > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-3">Migration</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={handleRunDryRun}
                disabled={running}
                variant="outline"
                className="gap-1"
              >
                {running ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Dry-Run Preview
                  </>
                )}
              </Button>
              <Button
                onClick={handleRunMigration}
                disabled={running}
                className="gap-1"
              >
                {running ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Migration
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dry-run shows what will be changed without modifying the database.
            </p>
          </div>
        )}

        {/* Migration Results */}
        {result && (
          <div>
            <h3 className="font-semibold text-sm mb-3">Results</h3>
            <Alert className={result.success ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className={result.success ? 'text-success' : 'text-destructive'}>
                {result.message}
              </AlertDescription>
            </Alert>

            {result.affected_count > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Updated Records ({result.affected_count})</h4>
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted sticky top-0">
                        <TableHead>Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Old Rate</TableHead>
                        <TableHead>New Rate</TableHead>
                        <TableHead>New FX Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.updated_records.map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{record.number}</TableCell>
                          <TableCell className="capitalize">{record.type}</TableCell>
                          <TableCell>
                            {record.old_exchange_rate ? (
                              <span>{record.old_exchange_rate.toFixed(2)}</span>
                            ) : (
                              <span className="text-muted-foreground">NULL</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {record.new_exchange_rate.toFixed(2)}
                          </TableCell>
                          <TableCell>{formatDate(record.new_fx_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2 text-destructive">Errors ({result.errors.length})</h4>
                <div className="space-y-1">
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">What this does</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✓ Identifies USD invoices and quotations with null or missing exchange_rate/fx_date</li>
            <li>✓ Fetches historical USD→KES exchange rates from the creation date when available</li>
            <li>✓ Falls back to current rate if historical data is unavailable</li>
            <li>✓ Updates metadata without changing stored amounts (already in KES)</li>
            <li>✓ Makes migrated records display properly in ViewInvoiceModal with rate info</li>
            <li>✓ Enables consistent PDF export with currency metadata</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
