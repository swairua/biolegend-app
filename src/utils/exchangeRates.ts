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

  // 0) apilayer exchangeratesapi.io using API key if provided
  try {
    const key = (import.meta as any)?.env?.VITE_EXCHANGE_RATES_API_KEY as string | undefined;
    if (key) {
      const path = datePath === 'latest' ? 'latest' : datePath;
      // Use symbols for both base and quote to avoid base-change restriction on free plans
      const symbols = encodeURIComponent(`${base},${quote}`);
      const url = `https://api.exchangeratesapi.io/v1/${path}?access_key=${encodeURIComponent(key)}&symbols=${symbols}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const apiBase = json?.base as string | undefined; // likely 'EUR' on free plan
        const rates = json?.rates || {};
        const rBase = rates?.[base];
        const rQuote = rates?.[quote];
        if (apiBase && typeof rQuote === 'number') {
          if (apiBase === base) {
            // API base equals requested base
            if (rQuote > 0) return rQuote;
          } else if (typeof rBase === 'number' && rBase > 0) {
            // Convert via API base (e.g., EUR): quote/base
            const computed = rQuote / rBase;
            if (computed > 0) return computed;
          }
        }
        // Also check direct "result" in case of convert endpoint behavior
        if (typeof json?.result === 'number' && json.result > 0) {
          return json.result;
        }
      }
    }
  } catch (_) {}

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
