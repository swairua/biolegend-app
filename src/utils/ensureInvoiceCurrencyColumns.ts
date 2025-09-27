import { supabase } from '@/integrations/supabase/client';

import { supabase } from '@/integrations/supabase/client';

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
    // Prefer RPC if available
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      // If RPC is unavailable, attempt direct execution via a SQL function isn't possible here.
      // Swallow error so UI can proceed; insertion will fail if columns truly don't exist.
      console.warn('exec_sql RPC not available or failed when ensuring invoice currency columns:', error.message || error);
    }
  } catch (e) {
    console.warn('Failed to run ensureInvoiceCurrencyColumns via RPC:', e);
  }
}
