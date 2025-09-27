import { getLocaleForCurrency } from './exchangeRates';

// Pure formatter for use in both React components and non-React utilities (PDF generators)
export function formatCurrency(amount: number, code: string = 'KES', minimumFractionDigits = 2, maximumFractionDigits = 2): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const locale = getLocaleForCurrency(code);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch (err) {
    // Fallback: basic formatting
    return `${code} ${value.toFixed(Math.max(0, minimumFractionDigits))}`;
  }
}

export default formatCurrency;
