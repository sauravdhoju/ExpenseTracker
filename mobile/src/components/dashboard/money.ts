import { CURRENCIES } from '../../constants/currencies';
import type { CurrencyCode } from '../../types';

export const MASK = '••••••';

/** Splits an amount into symbol / whole / decimal parts so the hero can size them differently. */
export function splitAmount(amount: number, currency: CurrencyCode) {
  const { symbol, locale } = CURRENCIES[currency];
  const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(amount)
  );
  const dot = formatted.lastIndexOf(locale === 'de-DE' ? ',' : '.');
  return {
    symbol,
    whole: (amount < 0 ? '-' : '') + formatted.slice(0, dot),
    decimal: formatted.slice(dot),
  };
}

/** Short form for tight spaces: NPR 8.2K, NPR 1.5M. */
export function formatCompact(amount: number, currency: CurrencyCode): string {
  const { symbol } = CURRENCIES[currency];
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${symbol} ${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${sign}${symbol} ${(abs / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sign}${symbol} ${Math.round(abs).toLocaleString('en-IN')}`;
}

/** Amount without the currency symbol, for columns where the currency is already clear. */
export function formatPlain(amount: number, currency: CurrencyCode): string {
  const { locale } = CURRENCIES[currency];
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}
