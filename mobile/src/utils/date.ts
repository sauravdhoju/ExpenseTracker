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

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
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

export function nextOccurrence(
  from: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  const d = new Date(from + 'T00:00:00');
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return toISODate(d);
}
