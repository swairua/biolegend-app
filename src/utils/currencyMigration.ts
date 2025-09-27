import { executeSQL, formatSQLForManualExecution } from '@/utils/execSQL';

export const CURRENCY_MIGRATION_SQL = `
-- Invoices currency columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'KES';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fx_date DATE;
UPDATE invoices SET currency_code = COALESCE(currency_code, 'KES');
UPDATE invoices SET exchange_rate = COALESCE(exchange_rate, 1);
UPDATE invoices SET fx_date = COALESCE(fx_date, invoice_date);

-- Optional: Proforma, Quotations, Credit Notes (best-effort if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_invoices') THEN
    EXECUTE 'ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'UPDATE proforma_invoices SET currency_code = COALESCE(currency_code, ''KES''), exchange_rate = COALESCE(exchange_rate, 1)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
    EXECUTE 'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'UPDATE quotations SET currency_code = COALESCE(currency_code, ''KES''), exchange_rate = COALESCE(exchange_rate, 1)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_notes') THEN
    EXECUTE 'ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'UPDATE credit_notes SET currency_code = COALESCE(currency_code, ''KES''), exchange_rate = COALESCE(exchange_rate, 1)';
  END IF;
END $$;`;

export async function runCurrencyMigration(): Promise<{ success: boolean; manualSQL?: string; message: string }>{
  const res = await executeSQL(CURRENCY_MIGRATION_SQL);
  if (res.error) {
    return { success: false, message: res.error.message || 'Migration failed' };
  }
  if (res.manual_execution_required) {
    return { success: false, manualSQL: formatSQLForManualExecution(CURRENCY_MIGRATION_SQL), message: res.message || 'Manual execution required' };
  }
  return { success: true, message: 'Currency columns added/updated successfully' };
}
