import { useAppStore } from '../store/useAppStore';
import { formatCurrency } from '../constants/currencies';

export function useCurrency() {
  const currency = useAppStore((s) => s.settings.currency);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);

  const format = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, currency);
  };

  return { currency, format, hideBalances };
}
