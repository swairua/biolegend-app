# Legacy USD Invoice & Quotation Migration

## Overview

This migration backfills currency metadata for USD invoices and quotations created before the new currency conversion system was fully implemented. Records may be missing:
- `currency_code` (should be 'USD')
- `exchange_rate` (USD→KES conversion rate at creation)
- `fx_date` (date the rate applies to)

## Data Safety

✅ **Safe to run multiple times** - The migration is idempotent
✅ **Stored amounts never change** - Only metadata is added
✅ **Dry-run preview available** - See changes before committing
✅ **Fully logged** - Every change is tracked for audit

## Access

Navigate to: **`/migrate/legacy-usd`**

## How It Works

### Phase 1: Identification
Scans for invoices and quotations where:
- `currency_code = 'USD'` AND
- (`exchange_rate IS NULL` OR `fx_date IS NULL`)

### Phase 2: Rate Lookup
For each legacy record:
1. **Primary**: Try to fetch historical USD→KES rate from the creation date
2. **Fallback**: Use current USD→KES rate if historical unavailable
3. **Emergency**: Default to 130.00 if API unavailable (rare)

### Phase 3: Backfill
Updates records with:
```json
{
  "currency_code": "USD",
  "exchange_rate": 130.50,  // example
  "fx_date": "2024-10-15"   // original creation date
}
```

## Before & After

### Before Migration
```
Invoice 001:
  currency_code: 'USD'
  exchange_rate: NULL        ← Missing
  fx_date: NULL              ← Missing
  subtotal: 5000 (in KES)
```

### After Migration
```
Invoice 001:
  currency_code: 'USD'
  exchange_rate: 130.50      ← Backfilled
  fx_date: '2024-10-15'      ← Backfilled
  subtotal: 5000 (in KES, unchanged)
```

### Display Impact
After migration, `ViewInvoiceModal` can now show:
> "Created at 1 USD = 130.50 KES on 2024-10-15"

PDF exports will include complete rate information.

## Using the UI

### 1. Check Status
The component loads on entry and shows:
- Count of legacy records needing backfill
- Health status of data

### 2. Preview Sample Records
Click **"Load Sample Records"** to see:
- 5 example records
- Their current metadata state
- What will be updated

### 3. Run Dry-Run
Click **"Dry-Run Preview"** to:
- Simulate the migration without modifying DB
- See exactly which records would be updated
- Review the rates that would be used
- Check for any potential issues

### 4. Execute Migration
Click **"Run Migration"** to:
- Apply changes to the database
- Shows progress and success count
- Lists any records that failed
- Automatically reloads the record count

## Database Backup

**Recommended before running**: Create a Supabase backup

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → Backups**
4. Click **Create Backup**
5. Wait for completion (usually 1-5 minutes)

To restore if needed:
1. Go to **Settings → Backups**
2. Click **Restore** on the desired backup

## Manual Execution (SQL)

If you prefer SQL, run this for invoices:

```sql
-- For each legacy invoice:
UPDATE invoices
SET 
  exchange_rate = 130.50,  -- Replace with actual rate
  fx_date = '2024-10-15',  -- Replace with creation date
  currency_code = 'USD'
WHERE 
  id = '<invoice_id>'
  AND currency_code = 'USD'
  AND (exchange_rate IS NULL OR fx_date IS NULL);
```

## Troubleshooting

### No records found
This is good! All your USD records are already up to date.

### Migration hangs
- Check browser console for errors (F12)
- Verify internet connection
- Ensure Supabase is accessible
- Reload the page and try again

### Rate lookup failures
The migration automatically falls back:
1. Historical rate attempt → Success (uses actual rate from creation date)
2. Current rate fallback → Success (uses today's rate)
3. Default rate (130.00) → Last resort

All attempts are logged. Check the results panel.

### Some records failed
- Click **Run Migration** again (safe to retry)
- Or update individual records manually
- Check browser console for specific error messages

## Exchange Rate Sources

The system tries these in order:
1. **exchangeratesapi.io** (if API key configured)
2. **exchangerate.host** (free, reliable)
3. **frankfurter.app** (free, European)
4. **open.er-api.com** (current rate only)

All support historical rate lookups except the last one.

## Results Details

After running, the results panel shows:

**Updated Records Table:**
- Document number
- Type (invoice or quotation)
- Old exchange rate (or NULL)
- New exchange rate
- New FX date

**Error Log (if any):**
- Specific record and reason for failure
- Helpful for debugging

## Future-Proofing

After migration, all new USD invoices/quotations will automatically have:
- Locked exchange rate at creation time
- FX date set to creation date
- Proper currency code

This migration only fills gaps from legacy records.

## Questions or Issues?

1. Check the **Browser Console** (F12) for detailed logs
2. Ensure database connectivity
3. Review **Dry-Run Preview** before live migration
4. Contact support with the error message if issues persist

## Technical Notes

- Uses Supabase PostgREST API for queries
- Batches rate lookups to avoid API throttling
- Handles timezone conversions automatically
- Idempotent: Safe to run multiple times
- All amounts stored in KES; only metadata is updated
