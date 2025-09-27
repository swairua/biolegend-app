import { executeSQL } from '@/utils/execSQL';

export async function ensureInvoiceCurrencyColumns(): Promise<void> {
  const sql = `
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'KES';
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fx_date DATE;
    UPDATE invoices SET currency_code = COALESCE(currency_code, 'KES');
    UPDATE invoices SET exchange_rate = COALESCE(exchange_rate, 1);
    UPDATE invoices SET fx_date = COALESCE(fx_date, invoice_date);
  `;

  try {
    await executeSQL(sql);
  } catch (e) {
    console.warn('ensureInvoiceCurrencyColumns could not run automatically:', e);
  }
}
