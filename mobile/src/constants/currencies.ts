import type { CurrencyCode } from '../types';

export const CURRENCIES: Record<
  CurrencyCode,
  { symbol: string; name: string; locale: string }
> = {
  NPR: { symbol: 'NPR', name: 'Nepalese Rupee', locale: 'en-IN' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
};

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const { symbol, locale } = CURRENCIES[currency];
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol} ${formatted}`;
}
