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

async function fetchWithRetry(url: string, maxAttempts = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per request
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1))); // exponential backoff
      }
    }
  }
  throw lastError || new Error('Fetch failed after retries');
}

export async function getExchangeRate(base: string, quote: string, date?: string): Promise<number> {
  if (base === quote) return 1;
  const datePath = getDatePath(date);
  const errors: string[] = [];

  // 0) apilayer exchangeratesapi.io using API key if provided
  try {
    const key = (import.meta as any)?.env?.VITE_EXCHANGE_RATES_API_KEY as string | undefined;
    if (key) {
      const path = datePath === 'latest' ? 'latest' : datePath;
      const symbols = encodeURIComponent(`${base},${quote}`);
      const url = `https://api.exchangeratesapi.io/v1/${path}?access_key=${encodeURIComponent(key)}&symbols=${symbols}`;

      try {
        const res = await fetchWithRetry(url);
        if (res.ok) {
          const json = await res.json();
          const apiBase = json?.base as string | undefined;
          const rates = json?.rates || {};
          const rBase = rates?.[base];
          const rQuote = rates?.[quote];
          if (apiBase && typeof rQuote === 'number') {
            if (apiBase === base) {
              if (rQuote > 0) return rQuote;
            } else if (typeof rBase === 'number' && rBase > 0) {
              const computed = rQuote / rBase;
              if (computed > 0) return computed;
            }
          }
          if (typeof json?.result === 'number' && json.result > 0) {
            return json.result;
          }
        } else {
          errors.push(`exchangeratesapi.io: HTTP ${res.status}`);
        }
      } catch (err) {
        errors.push(`exchangeratesapi.io fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`exchangeratesapi.io setup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 1) exchangerate.host
  try {
    const url = `https://api.exchangerate.host/${datePath}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;
    const res = await fetchWithRetry(url);
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[quote];
      if (typeof rate === 'number' && rate > 0) return rate;
    } else {
      errors.push(`exchangerate.host: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`exchangerate.host failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2) frankfurter.app
  try {
    const path = datePath === 'latest' ? 'latest' : datePath;
    const url = `https://api.frankfurter.app/${path}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`;
    const res = await fetchWithRetry(url);
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[quote];
      if (typeof rate === 'number' && rate > 0) return rate;
    } else {
      errors.push(`frankfurter.app: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`frankfurter.app failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3) open.er-api.com (latest only, no historical)
  try {
    const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
    const res = await fetchWithRetry(url);
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[quote];
      if (typeof rate === 'number' && rate > 0) return rate;
    } else {
      errors.push(`open.er-api.com: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`open.er-api.com failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Log all provider failures for debugging (console only, not to auth system)
  if (process.env.NODE_ENV === 'development' && errors.length > 0) {
    console.warn('Exchange rate providers failed:', errors);
  }

  throw new Error(`Unable to fetch exchange rate for ${base}/${quote}`);
}
