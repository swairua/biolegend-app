import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getExchangeRate, getLocaleForCurrency } from '@/utils/exchangeRates';
import { toast } from '@/hooks/use-toast';

export type CurrencyCode = 'KES' | 'USD';

interface CurrencyState {
  currency: CurrencyCode;
  rate: number; // 1 KES = rate USD
  setCurrency: (c: CurrencyCode) => Promise<void>;
  setRate: (r: number) => void;
  format: (amount: number, code?: CurrencyCode) => string;
}

const CurrencyContext = createContext<CurrencyState | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem('app_currency');
    return (stored === 'USD' || stored === 'KES') ? stored : 'KES';
  });
  const [rate, setRate] = useState<number>(() => {
    const stored = localStorage.getItem('app_currency_rate');
    const val = stored ? parseFloat(stored) : 1;
    return Number.isFinite(val) && val > 0 ? val : 1;
  });

  useEffect(() => {
    localStorage.setItem('app_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('app_currency_rate', String(rate));
  }, [rate]);

  const setCurrency = async (c: CurrencyCode) => {
    if (c === currency) return;

    if (c === 'USD') {
      try {
        // Fetch latest KES->USD to use for UI conversions
        const fetched = await getExchangeRate('KES', 'USD');
        if (fetched && fetched > 0) {
          setRate(fetched);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch exchange rate';
        console.error('Exchange rate fetch failed:', error);
        toast({
          title: 'Exchange Rate Error',
          description: message,
          variant: 'destructive',
        });
        // Still update currency even if rate fetch fails, using existing rate as fallback
      }
    } else {
      // KES baseline
      setRate(1);
    }
    setCurrencyState(c as CurrencyCode);
  };

  const format = (amount: number, code: CurrencyCode = currency) => {
    return new Intl.NumberFormat(getLocaleForCurrency(code), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const value = useMemo(() => ({ currency, rate, setCurrency, setRate, format }), [currency, rate]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
