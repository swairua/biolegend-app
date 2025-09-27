-- Add currency support across core transactional tables
-- Existing data assumed in KES; default to KES with rate 1 and fx_date = document date

-- Always ensure invoices have currency fields
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'KES';
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1;
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS fx_date DATE;
UPDATE invoices SET currency_code = COALESCE(currency_code, 'KES');
UPDATE invoices SET exchange_rate = COALESCE(exchange_rate, 1);
UPDATE invoices SET fx_date = COALESCE(fx_date, invoice_date);

DO $$
BEGIN
  -- Quotations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
    EXECUTE 'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS fx_date DATE';
    EXECUTE 'UPDATE quotations SET currency_code = COALESCE(currency_code, ''KES'')';
    EXECUTE 'UPDATE quotations SET exchange_rate = COALESCE(exchange_rate, 1)';
    -- Prefer quotation_date when available
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quotations' AND column_name = 'quotation_date'
    ) THEN
      EXECUTE 'UPDATE quotations SET fx_date = COALESCE(fx_date, quotation_date)';
    ELSE
      EXECUTE 'UPDATE quotations SET fx_date = COALESCE(fx_date, CURRENT_DATE)';
    END IF;
  END IF;

  -- Proforma Invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_invoices') THEN
    EXECUTE 'ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS fx_date DATE';
    EXECUTE 'UPDATE proforma_invoices SET currency_code = COALESCE(currency_code, ''KES'')';
    EXECUTE 'UPDATE proforma_invoices SET exchange_rate = COALESCE(exchange_rate, 1)';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'proforma_invoices' AND column_name = 'proforma_date'
    ) THEN
      EXECUTE 'UPDATE proforma_invoices SET fx_date = COALESCE(fx_date, proforma_date)';
    ELSE
      EXECUTE 'UPDATE proforma_invoices SET fx_date = COALESCE(fx_date, CURRENT_DATE)';
    END IF;
  END IF;

  -- Credit Notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_notes') THEN
    EXECUTE 'ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS fx_date DATE';
    EXECUTE 'UPDATE credit_notes SET currency_code = COALESCE(currency_code, ''KES'')';
    EXECUTE 'UPDATE credit_notes SET exchange_rate = COALESCE(exchange_rate, 1)';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'credit_notes' AND column_name = 'credit_note_date'
    ) THEN
      EXECUTE 'UPDATE credit_notes SET fx_date = COALESCE(fx_date, credit_note_date)';
    ELSE
      EXECUTE 'UPDATE credit_notes SET fx_date = COALESCE(fx_date, CURRENT_DATE)';
    END IF;
  END IF;

  -- Payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    EXECUTE 'ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'ALTER TABLE payments ADD COLUMN IF NOT EXISTS fx_date DATE';
    EXECUTE 'UPDATE payments SET currency_code = COALESCE(currency_code, ''KES'')';
    EXECUTE 'UPDATE payments SET exchange_rate = COALESCE(exchange_rate, 1)';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'payments' AND column_name = 'payment_date'
    ) THEN
      EXECUTE 'UPDATE payments SET fx_date = COALESCE(fx_date, payment_date)';
    ELSE
      EXECUTE 'UPDATE payments SET fx_date = COALESCE(fx_date, CURRENT_DATE)';
    END IF;
  END IF;

  -- Remittance Advice
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remittance_advice') THEN
    EXECUTE 'ALTER TABLE remittance_advice ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE remittance_advice ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'ALTER TABLE remittance_advice ADD COLUMN IF NOT EXISTS fx_date DATE';
    EXECUTE 'UPDATE remittance_advice SET currency_code = COALESCE(currency_code, ''KES'')';
    EXECUTE 'UPDATE remittance_advice SET exchange_rate = COALESCE(exchange_rate, 1)';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'remittance_advice' AND column_name = 'advice_date'
    ) THEN
      EXECUTE 'UPDATE remittance_advice SET fx_date = COALESCE(fx_date, advice_date)';
    ELSE
      EXECUTE 'UPDATE remittance_advice SET fx_date = COALESCE(fx_date, CURRENT_DATE)';
    END IF;
  END IF;

  -- Local Purchase Orders (LPOs)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpos') THEN
    EXECUTE 'ALTER TABLE lpos ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''KES''';
    EXECUTE 'ALTER TABLE lpos ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1';
    EXECUTE 'ALTER TABLE lpos ADD COLUMN IF NOT EXISTS fx_date DATE';
    EXECUTE 'UPDATE lpos SET currency_code = COALESCE(currency_code, ''KES'')';
    EXECUTE 'UPDATE lpos SET exchange_rate = COALESCE(exchange_rate, 1)';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lpos' AND column_name = 'lpo_date'
    ) THEN
      EXECUTE 'UPDATE lpos SET fx_date = COALESCE(fx_date, lpo_date)';
    ELSE
      EXECUTE 'UPDATE lpos SET fx_date = COALESCE(fx_date, CURRENT_DATE)';
    END IF;
  END IF;
END $$;
