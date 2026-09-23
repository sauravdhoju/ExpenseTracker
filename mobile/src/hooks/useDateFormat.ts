import { useAppStore } from '../store/useAppStore';
import { formatDisplayDate, formatBsMonthYear } from '../utils/bsDate';
import { MONTH_NAMES } from '../utils/date';

export function useDateFormat() {
  const dateSystem = useAppStore((s) => s.settings.dateSystem);

  return {
    dateSystem,
    format: (iso: string) => formatDisplayDate(iso, dateSystem),
    formatMonthYear: (date: Date) =>
      dateSystem === 'BS' ? formatBsMonthYear(date) : `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
  };
}
