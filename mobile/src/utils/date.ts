export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isSameMonth(isoDate: string, date: Date): boolean {
  return isoDate.slice(0, 7) === monthKey(date);
}

export function isSameDay(isoDate: string, date: Date): boolean {
  return isoDate === toISODate(date);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOffset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayOffset);
  return d;
}

export function isSameWeek(isoDate: string, date: Date): boolean {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return isoDate >= toISODate(start) && isoDate <= toISODate(end);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  const from = new Date(fromISO + 'T00:00:00');
  const to = new Date(toISOStr + 'T00:00:00');
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function formatFriendlyDate(isoDate: string): string {
  const today = todayISO();
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  const d = new Date(isoDate + 'T00:00:00');
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

export function groupLabel(isoDate: string): 'Today' | 'Yesterday' | 'This Week' | 'Earlier' {
  const today = todayISO();
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  const diff = daysBetween(isoDate, today);
  if (diff >= 0 && diff <= 7) return 'This Week';
  return 'Earlier';
}

/**
 * Advances by whole Gregorian months, clamping to the target month's last
 * valid day instead of letting native `Date` overflow into the month after
 * (e.g. Jan 31 + 1 month lands on Feb 28/29, never silently rolls to Mar 2/3).
 */
export function addMonthsClamped(iso: string, count: number): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  const targetMonthFirst = new Date(d.getFullYear(), d.getMonth() + count, 1);
  const daysInTargetMonth = new Date(targetMonthFirst.getFullYear(), targetMonthFirst.getMonth() + 1, 0).getDate();
  targetMonthFirst.setDate(Math.min(day, daysInTargetMonth));
  return toISODate(targetMonthFirst);
}

/** Same clamping rule as {@link addMonthsClamped}, for whole-year steps (handles Feb 29 on a non-leap target year). */
export function addYearsClamped(iso: string, count: number): string {
  const d = new Date(iso + 'T00:00:00');
  const targetYear = d.getFullYear() + count;
  const daysInTargetMonth = new Date(targetYear, d.getMonth() + 1, 0).getDate();
  const day = Math.min(d.getDate(), daysInTargetMonth);
  return toISODate(new Date(targetYear, d.getMonth(), day));
}

export function nextOccurrence(
  from: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  switch (frequency) {
    case 'daily':
      return addDays(from, 1);
    case 'weekly':
      return addDays(from, 7);
    case 'monthly':
      return addMonthsClamped(from, 1);
    case 'yearly':
      return addYearsClamped(from, 1);
  }
}
