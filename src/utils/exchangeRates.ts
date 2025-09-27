export type SupportedCurrency = 'KES' | 'USD';

function getDatePath(date?: string) {
  if (!date) return 'latest';
  // Ensure YYYY-MM-DD
  try {
    const d = new Date(date);
    const iso = d.toISOString().split('T')[0];
    return iso;
  } catch {
    return 'latest';
  }
}

export function getLocaleForCurrency(currency: string): string {
  switch (currency) {
    case 'KES':
      return 'en-KE';
    case 'USD':
      return 'en-US';
    default:
      return 'en-US';
  }
}

export async function getExchangeRate(base: string, quote: string, date?: string): Promise<number> {
  if (base === quote) return 1;
  const datePath = getDatePath(date);

  // 1) exchangerate.host
  try {
    const url = `https://api.exchangerate.host/${datePath}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[quote];
      if (typeof rate === 'number' && rate > 0) return rate;
    }
  } catch (_) {}

  // 2) frankfurter.app
  try {
    const path = datePath === 'latest' ? 'latest' : datePath;
    const url = `https://api.frankfurter.app/${path}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[quote];
      if (typeof rate === 'number' && rate > 0) return rate;
    }
  } catch (_) {}

  // 3) open.er-api.com (latest only, no historical)
  try {
    const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[quote];
      if (typeof rate === 'number' && rate > 0) return rate;
    }
  } catch (_) {}

  throw new Error(`Unable to fetch exchange rate for ${base}/${quote}`);
}
