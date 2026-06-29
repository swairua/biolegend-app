import { LegacyUsdMigration } from '@/components/fixes/LegacyUsdMigration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function LegacyUsdMigrationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-warning mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Legacy USD Data Migration</h1>
          <p className="text-muted-foreground mt-1">
            Backfill currency metadata for USD invoices and quotations created before the currency system was updated.
          </p>
        </div>
      </div>

      <LegacyUsdMigration />

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">How This Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Phase 1: Identification</h4>
            <p className="text-muted-foreground">
              Scans your invoices and quotations for records marked as USD currency but missing exchange rate or FX date metadata.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Phase 2: Rate Lookup</h4>
            <p className="text-muted-foreground">
              For each legacy record, attempts to fetch the historical USD→KES exchange rate from the creation date. Falls back to the current rate if historical data is unavailable.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Phase 3: Backfill</h4>
            <p className="text-muted-foreground">
              Updates the records with the exchange rate and FX date. Stored amounts are never modified—only metadata is added to enable proper display and auditing.
            </p>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Data Safety</h4>
            <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Dry-run mode lets you preview changes without modifying the database</li>
              <li>All updates are logged for audit purposes</li>
              <li>The operation is idempotent and can be safely re-run</li>
              <li>Stored invoice/quotation amounts are never changed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
