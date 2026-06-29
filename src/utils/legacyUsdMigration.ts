import { supabase } from '@/integrations/supabase/client';
import { getExchangeRate } from '@/utils/exchangeRates';

export interface LegacyUsdRecord {
  id: string;
  number: string;
  type: 'invoice' | 'quotation';
  currency_code: string | null;
  exchange_rate: number | null;
  fx_date: string | null;
  created_at: string;
  creation_date: string;
}

export interface MigrationResult {
  success: boolean;
  affected_count: number;
  updated_records: Array<{
    id: string;
    number: string;
    type: string;
    old_exchange_rate: number | null;
    new_exchange_rate: number;
    old_fx_date: string | null;
    new_fx_date: string;
  }>;
  errors: string[];
  message: string;
}

interface LegacyRecord {
  id: string;
  invoice_number?: string;
  quotation_number?: string;
  currency_code: string | null;
  exchange_rate: number | null;
  fx_date: string | null;
  created_at: string;
  invoice_date?: string;
  quotation_date?: string;
}

async function identifyLegacyUsdRecords(): Promise<{
  invoices: LegacyRecord[];
  quotations: LegacyRecord[];
}> {
  const invoices: LegacyRecord[] = [];
  const quotations: LegacyRecord[] = [];

  // Fetch invoices with USD currency but missing metadata
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, invoice_number, currency_code, exchange_rate, fx_date, created_at, invoice_date')
    .eq('currency_code', 'USD')
    .or('exchange_rate.is.null,fx_date.is.null');

  if (invoiceError) {
    console.warn('Error fetching legacy invoices:', invoiceError);
  } else if (invoiceData) {
    invoices.push(...invoiceData as LegacyRecord[]);
  }

  // Fetch quotations with USD currency but missing metadata
  const { data: quotationData, error: quotationError } = await supabase
    .from('quotations')
    .select('id, quotation_number, currency_code, exchange_rate, fx_date, created_at, quotation_date')
    .eq('currency_code', 'USD')
    .or('exchange_rate.is.null,fx_date.is.null');

  if (quotationError) {
    console.warn('Error fetching legacy quotations:', quotationError);
  } else if (quotationData) {
    quotations.push(...quotationData as LegacyRecord[]);
  }

  return { invoices, quotations };
}

async function getHistoricalOrCurrentRate(
  baseDate: string,
  dryRun: boolean = false
): Promise<{ rate: number; source: 'historical' | 'current' }> {
  try {
    // Try to fetch historical rate for USD->KES on the creation date
    const rate = await getExchangeRate('USD', 'KES', baseDate);
    return { rate, source: 'historical' };
  } catch (err) {
    // Fallback to current rate
    try {
      const rate = await getExchangeRate('USD', 'KES');
      return { rate, source: 'current' };
    } catch (fallbackErr) {
      // If all else fails, use a default rate (this shouldn't happen in practice)
      console.warn('Could not fetch any exchange rate, using default 130.00');
      return { rate: 130.0, source: 'current' };
    }
  }
}

async function backfillExchangeRates(
  invoices: LegacyRecord[],
  quotations: LegacyRecord[],
  dryRun: boolean = false
): Promise<{
  updated: Array<{
    id: string;
    number: string;
    type: string;
    old_exchange_rate: number | null;
    new_exchange_rate: number;
    old_fx_date: string | null;
    new_fx_date: string;
  }>;
  errors: string[];
}> {
  const updated: Array<any> = [];
  const errors: string[] = [];

  // Process invoices
  for (const invoice of invoices) {
    try {
      const creationDate = invoice.invoice_date || invoice.created_at;
      const { rate, source } = await getHistoricalOrCurrentRate(creationDate, dryRun);
      const fxDate = invoice.fx_date || creationDate.split('T')[0];

      if (!dryRun) {
        const { error } = await supabase
          .from('invoices')
          .update({
            exchange_rate: rate,
            fx_date: fxDate,
            currency_code: 'USD',
          })
          .eq('id', invoice.id);

        if (error) {
          errors.push(`Invoice ${invoice.invoice_number}: ${error.message}`);
          continue;
        }
      }

      updated.push({
        id: invoice.id,
        number: invoice.invoice_number || 'N/A',
        type: 'invoice',
        old_exchange_rate: invoice.exchange_rate,
        new_exchange_rate: rate,
        old_fx_date: invoice.fx_date,
        new_fx_date: fxDate,
      });

      console.log(
        `✓ Invoice ${invoice.invoice_number}: rate=${rate} (${source}), fx_date=${fxDate}`
      );
    } catch (err: any) {
      const msg = `Invoice ${invoice.invoice_number}: ${err?.message || 'Unknown error'}`;
      errors.push(msg);
      console.error(msg);
    }
  }

  // Process quotations
  for (const quotation of quotations) {
    try {
      const creationDate = quotation.quotation_date || quotation.created_at;
      const { rate, source } = await getHistoricalOrCurrentRate(creationDate, dryRun);
      const fxDate = quotation.fx_date || creationDate.split('T')[0];

      if (!dryRun) {
        const { error } = await supabase
          .from('quotations')
          .update({
            exchange_rate: rate,
            fx_date: fxDate,
            currency_code: 'USD',
          })
          .eq('id', quotation.id);

        if (error) {
          errors.push(`Quotation ${quotation.quotation_number}: ${error.message}`);
          continue;
        }
      }

      updated.push({
        id: quotation.id,
        number: quotation.quotation_number || 'N/A',
        type: 'quotation',
        old_exchange_rate: quotation.exchange_rate,
        new_exchange_rate: rate,
        old_fx_date: quotation.fx_date,
        new_fx_date: fxDate,
      });

      console.log(
        `✓ Quotation ${quotation.quotation_number}: rate=${rate} (${source}), fx_date=${fxDate}`
      );
    } catch (err: any) {
      const msg = `Quotation ${quotation.quotation_number}: ${err?.message || 'Unknown error'}`;
      errors.push(msg);
      console.error(msg);
    }
  }

  return { updated, errors };
}

export async function runLegacyUsdMigration(dryRun: boolean = true): Promise<MigrationResult> {
  console.log(`🔍 Starting Legacy USD Migration (${dryRun ? 'DRY RUN' : 'LIVE'})...`);

  try {
    // Phase 1: Identify legacy USD records
    console.log('📊 Phase 1: Identifying legacy USD records...');
    const { invoices, quotations } = await identifyLegacyUsdRecords();
    const totalRecords = invoices.length + quotations.length;

    if (totalRecords === 0) {
      console.log('✅ No legacy USD records found. Migration complete.');
      return {
        success: true,
        affected_count: 0,
        updated_records: [],
        errors: [],
        message: 'No legacy USD records found',
      };
    }

    console.log(`Found ${invoices.length} invoices and ${quotations.length} quotations needing backfill`);

    // Phase 2: Backfill exchange rates
    console.log('💱 Phase 2: Backfilling exchange rates...');
    const { updated, errors } = await backfillExchangeRates(invoices, quotations, dryRun);

    const successCount = updated.length;
    const failureCount = errors.length;

    console.log(`\n✅ Migration complete:`);
    console.log(`   - Updated: ${successCount}`);
    console.log(`   - Errors: ${failureCount}`);
    console.log(`   - Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => console.log(`   - ${err}`));
    }

    return {
      success: errors.length === 0,
      affected_count: successCount,
      updated_records: updated,
      errors,
      message: dryRun
        ? `Dry-run complete: ${successCount} records ready to update`
        : `Migration complete: ${successCount} records updated, ${failureCount} errors`,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error during migration';
    console.error('❌ Migration failed:', errorMsg);
    return {
      success: false,
      affected_count: 0,
      updated_records: [],
      errors: [errorMsg],
      message: `Migration failed: ${errorMsg}`,
    };
  }
}

export async function getLegacyUsdRecordCount(): Promise<number> {
  try {
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('currency_code', 'USD')
      .or('exchange_rate.is.null,fx_date.is.null');

    const { data: quotations, error: quotationError } = await supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .eq('currency_code', 'USD')
      .or('exchange_rate.is.null,fx_date.is.null');

    const invoiceCount = !invoiceError ? (invoices?.length || 0) : 0;
    const quotationCount = !quotationError ? (quotations?.length || 0) : 0;

    return invoiceCount + quotationCount;
  } catch (err) {
    console.warn('Error fetching legacy record count:', err);
    return 0;
  }
}

export async function getPreviewRecords(limit: number = 5): Promise<LegacyRecord[]> {
  try {
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, currency_code, exchange_rate, fx_date, created_at, invoice_date')
      .eq('currency_code', 'USD')
      .or('exchange_rate.is.null,fx_date.is.null')
      .limit(limit);

    if (invoiceError || !invoices) {
      return [];
    }

    return invoices as LegacyRecord[];
  } catch (err) {
    console.warn('Error fetching preview records:', err);
    return [];
  }
}
