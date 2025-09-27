import { useCurrency } from '@/contexts/CurrencyContext';

export function CurrencySwitcher() {
  const { currency, rate, setCurrency, format } = useCurrency();
  return (
    <div className="flex items-center gap-2">
      <select
        value={currency}
        onChange={async (e) => {
          await setCurrency(e.target.value as any);
        }}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        aria-label="Currency selector"
      >
        <option value="KES">KES</option>
        <option value="USD">USD</option>
      </select>
      <span className="text-xs text-muted-foreground hidden md:inline-block">
        {currency === 'USD' ? `1 KES = ${rate.toFixed(6)} USD` : `${format(1, 'KES')} = ${format(1 / Math.max(rate, 1), 'USD')}`}
      </span>
    </div>
  );
}
