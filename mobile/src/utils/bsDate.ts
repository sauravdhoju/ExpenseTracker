import DateConverter from '@remotemerge/nepali-date-converter';
import { addDays, addMonths, daysBetween, formatFriendlyDate, MONTH_NAMES, toISODate } from './date';
import type { DateSystem } from '../types';

export const BS_MONTH_NAMES = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

export interface BsDate {
  year: number;
  month: number; // 1-indexed, Baishakh = 1
  date: number;
}

/** Converts a Gregorian ISO date (YYYY-MM-DD) to its Bikram Sambat equivalent. */
export function adIsoToBs(iso: string): BsDate {
  const { year, month, date } = new DateConverter(iso).toBs();
  return { year, month, date };
}

/** Converts a Bikram Sambat year/month/date back to a Gregorian ISO date (YYYY-MM-DD). */
export function bsToAdIso(year: number, month: number, date: number): string {
  const bsInput = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  const { year: y, month: m, date: d } = new DateConverter(bsInput).toAd();
  return toISODate(new Date(y, m - 1, d));
}

export function formatBsDate(iso: string): string {
  const bs = adIsoToBs(iso);
  return `${bs.date} ${BS_MONTH_NAMES[bs.month - 1]} ${bs.year}`;
}

/**
 * Formats an ISO date for display in the user's preferred calendar.
 * `formatFriendlyDate` already special-cases Today/Yesterday for AD; BS mode
 * shows the plain BS date (relative-day phrasing doesn't need a calendar).
 */
export function formatDisplayDate(iso: string, dateSystem: DateSystem): string {
  return dateSystem === 'BS' ? formatBsDate(iso) : formatFriendlyDate(iso);
}

export function formatBsMonthYear(date: Date): string {
  const bs = adIsoToBs(toISODate(date));
  return `${BS_MONTH_NAMES[bs.month - 1]} ${bs.year}`;
}

export interface BsMonthInfo {
  year: number;
  month: number; // 1-12
  daysInMonth: number;
  firstDayAdIso: string;
}

/** BS months are 29-32 days depending on the year, so this is derived from AD conversions rather than a hardcoded table. */
export function getBsMonthInfo(anchor: Date): BsMonthInfo {
  const bs = adIsoToBs(toISODate(anchor));
  const firstDayAdIso = bsToAdIso(bs.year, bs.month, 1);
  const nextMonth = bs.month === 12 ? { year: bs.year + 1, month: 1 } : { year: bs.year, month: bs.month + 1 };
  const nextFirstDayAdIso = bsToAdIso(nextMonth.year, nextMonth.month, 1);
  const daysInMonth = daysBetween(firstDayAdIso, nextFirstDayAdIso);
  return { year: bs.year, month: bs.month, daysInMonth, firstDayAdIso };
}

/** Moves the anchor by `delta` whole BS months, landing mid-month to avoid edge-of-month rollover surprises. */
export function shiftBsMonth(anchor: Date, delta: number): Date {
  const bs = adIsoToBs(toISODate(anchor));
  let month = bs.month + delta;
  let year = bs.year;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return new Date(bsToAdIso(year, month, 15) + 'T00:00:00');
}

export interface MonthGridCell {
  adIso: string;
  dayNumber: number;
}

/** A month's calendar grid in the given system: a display label plus one cell (or null for a leading blank) per weekday slot. */
export function getMonthGrid(anchor: Date, dateSystem: DateSystem): { label: string; cells: (MonthGridCell | null)[] } {
  if (dateSystem === 'BS') {
    const info = getBsMonthInfo(anchor);
    const leadingBlanks = (new Date(info.firstDayAdIso + 'T00:00:00').getDay() + 6) % 7;
    const cells: (MonthGridCell | null)[] = Array(leadingBlanks).fill(null);
    for (let d = 0; d < info.daysInMonth; d++) {
      cells.push({ adIso: addDays(info.firstDayAdIso, d), dayNumber: d + 1 });
    }
    return { label: `${BS_MONTH_NAMES[info.month - 1]} ${info.year}`, cells };
  }

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (MonthGridCell | null)[] = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ adIso: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dayNumber: d });
  }
  return { label: `${MONTH_NAMES[month]} ${year}`, cells };
}

export function shiftMonth(anchor: Date, delta: number, dateSystem: DateSystem): Date {
  return dateSystem === 'BS' ? shiftBsMonth(anchor, delta) : addMonths(anchor, delta);
}
