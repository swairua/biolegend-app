import { CurrencyCode } from '@/contexts/CurrencyContext';

// Convert an amount using a KES->USD rate. If rate is invalid, returns the original amount.
export function convertAmount(amount: number, from: CurrencyCode, to: CurrencyCode, rate: number): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return round(amount);
  if (!Number.isFinite(rate) || rate <= 0) return round(amount);
  if (from === 'KES' && to === 'USD') return round(amount * rate);
  if (from === 'USD' && to === 'KES') return round(amount / rate);
  return round(amount);
}

// Normalize an invoice amount to a target currency.
// For USD->KES, prefer invoiceRate if provided. For KES->USD, use currentRate (UI rate).
export function normalizeInvoiceAmount(
  amount: number,
  recordCurrency: CurrencyCode | undefined,
  invoiceRate: number | undefined,
  targetCurrency: CurrencyCode,
  currentRate: number
): number {
  const from = (recordCurrency === 'USD' || recordCurrency === 'KES') ? recordCurrency : 'KES';
  if (from === targetCurrency) return round(amount || 0);
  // If record is USD and target is KES, prefer invoiceRate for historical accuracy
  if (from === 'USD' && targetCurrency === 'KES') {
    const rate = (Number.isFinite(invoiceRate) && (invoiceRate as number) > 0) ? (invoiceRate as number) : currentRate;
    return convertAmount(amount || 0, 'USD', 'KES', rate);
  }
  // If record is KES and target is USD, use current UI rate
  return convertAmount(amount || 0, 'KES', 'USD', currentRate);
}

export function round(n: number, dp = 2) {
  return Number.isFinite(n) ? parseFloat(n.toFixed(dp)) : 0;
}
