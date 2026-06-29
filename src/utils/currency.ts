import { CurrencyCode } from '@/contexts/CurrencyContext';

// Convert an amount using a USD->KES rate. If rate is invalid, returns the original amount.
// rate = 1 USD = X KES
export function convertAmount(amount: number, from: CurrencyCode, to: CurrencyCode, rate: number): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return round(amount);
  if (!Number.isFinite(rate) || rate <= 0) return round(amount);
  // rate is USD->KES (1 USD = X KES)
  if (from === 'USD' && to === 'KES') return round(amount * rate);
  if (from === 'KES' && to === 'USD') return round(amount / rate);
  return round(amount);
}

// Normalize an invoice amount to a target currency.
// Amounts are stored in KES after creation conversion.
// For display: if viewing in USD, convert stored KES back to USD using locked rate.
export function normalizeInvoiceAmount(
  amount: number,
  recordCurrency: CurrencyCode | undefined,
  invoiceRate: number | undefined,
  targetCurrency: CurrencyCode,
  currentRate: number
): number {
  const from = (recordCurrency === 'USD' || recordCurrency === 'KES') ? recordCurrency : 'KES';

  // Amounts are stored as KES (already converted at creation)
  // from = the original currency the invoice was created in (not the storage currency)
  if (from === 'KES') {
    // Invoice created in KES, stored as KES
    if (targetCurrency === 'KES') return round(amount || 0);
    if (targetCurrency === 'USD') return convertAmount(amount || 0, 'KES', 'USD', currentRate);
  }

  if (from === 'USD') {
    // Invoice created in USD, stored as KES
    // To display in KES: use stored amount directly
    if (targetCurrency === 'KES') return round(amount || 0);
    // To display in USD: convert KES back to USD using locked rate
    if (targetCurrency === 'USD') {
      const rate = (Number.isFinite(invoiceRate) && (invoiceRate as number) > 0) ? (invoiceRate as number) : currentRate;
      return convertAmount(amount || 0, 'KES', 'USD', rate);
    }
  }

  return round(amount || 0);
}

// Display an amount for the invoice considering the stored currency, rate, and current UI currency
export function displayAmount(
  amount: number,
  storedCurrency: CurrencyCode = 'KES',
  storedRate: number | undefined,
  uiCurrency: CurrencyCode = 'KES',
  currentRate: number = 1
): number {
  return normalizeInvoiceAmount(amount, storedCurrency, storedRate, uiCurrency, currentRate);
}

export function round(n: number, dp = 2) {
  return Number.isFinite(n) ? parseFloat(n.toFixed(dp)) : 0;
}
