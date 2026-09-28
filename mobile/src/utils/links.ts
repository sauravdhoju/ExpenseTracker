import { getPeriodRange, type DateRange } from '../services/calculations';
import { toISODate } from './date';
import type { DateSystem, TransactionType } from '../types';

/**
 * Deep-links into the Activity tab with an exact filter. Every screen that shows a
 * figure links here with the same date range and filters it used to compute that
 * figure, so the total Activity shows always equals the number that was tapped.
 */
export interface ActivityFilter {
  range?: DateRange;
  type?: TransactionType;
  categoryId?: string | null;
  accountId?: string | null;
}

export function activityHref(filter: ActivityFilter = {}) {
  const params: Record<string, string> = {
    // Changes on every tap, so a tab that's already mounted re-applies the filter.
    k: String(Date.now()),
  };
  if (filter.range) {
    params.from = filter.range.start;
    params.to = filter.range.end;
  }
  if (filter.type) params.type = filter.type;
  if (filter.categoryId) params.categoryId = filter.categoryId;
  if (filter.accountId) params.accountId = filter.accountId;
  return { pathname: '/(root)/(tabs)/transactions' as const, params };
}

export const ranges = {
  today: (now: Date): DateRange => ({ start: toISODate(now), end: toISODate(now) }),
  week: (now: Date): DateRange => getPeriodRange('week', now),
  month: (now: Date, dateSystem: DateSystem): DateRange => getPeriodRange('month', now, undefined, dateSystem),
};
