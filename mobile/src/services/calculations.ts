import type {
  Account,
  Budget,
  DailyTracking,
  DateSystem,
  ForgottenEntry,
  ForgottenStatus,
  Goal,
  Loan,
  LoanRepayment,
  LoanStatus,
  Transaction,
} from '../types';
import { addDays, daysBetween, isSameDay, isSameWeek, monthKey, startOfWeek, toISODate, todayISO } from '../utils/date';
import { getBsMonthInfo, getBsYearInfo, shiftMonth, shiftYear } from '../utils/bsDate';

export function getTotalBalance(accounts: Account[]): number {
  return accounts.filter((a) => a.isActive).reduce((sum, a) => sum + a.balance, 0);
}

/**
 * Filters to the calendar month containing `date`. In BS mode this is the
 * actual BS month's Gregorian span (e.g. Ashwin = Sep 17-Oct 17), not the
 * Gregorian month `date` happens to fall in.
 */
export function filterByMonth(transactions: Transaction[], date: Date, dateSystem: DateSystem = 'AD'): Transaction[] {
  if (dateSystem === 'BS') {
    const info = getBsMonthInfo(date);
    const endIso = addDays(info.firstDayAdIso, info.daysInMonth - 1);
    return transactions.filter((t) => t.date >= info.firstDayAdIso && t.date <= endIso);
  }
  const key = monthKey(date);
  return transactions.filter((t) => t.date.slice(0, 7) === key);
}

/** 1-indexed day-of-month position of `date` within its calendar month (AD or BS). */
export function getDayOfMonth(date: Date, dateSystem: DateSystem = 'AD'): number {
  if (dateSystem === 'BS') {
    const info = getBsMonthInfo(date);
    return daysBetween(info.firstDayAdIso, toISODate(date)) + 1;
  }
  return date.getDate();
}

export function filterByWeek(transactions: Transaction[], date: Date): Transaction[] {
  return transactions.filter((t) => isSameWeek(t.date, date));
}

export function filterByDay(transactions: Transaction[], date: Date): Transaction[] {
  return transactions.filter((t) => isSameDay(t.date, date));
}

export function getTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getNetCashFlow(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpenses(transactions);
}

export function getTotalLent(transactions: Transaction[]): number {
  return transactions.filter((t) => t.type === 'lent').reduce((sum, t) => sum + t.amount, 0);
}

export function getTotalRepaid(transactions: Transaction[]): number {
  return transactions.filter((t) => t.type === 'repayment').reduce((sum, t) => sum + t.amount, 0);
}

export function getLoanOutstanding(loan: Loan, repayments: LoanRepayment[]): number {
  const paid = repayments
    .filter((r) => r.loanId === loan.id)
    .reduce((sum, r) => sum + r.amount, 0);
  return loan.originalAmount - paid;
}

export function getLoanStatus(loan: Loan, repayments: LoanRepayment[]): LoanStatus {
  const outstanding = getLoanOutstanding(loan, repayments);
  if (outstanding <= 0) return 'repaid';
  const paid = loan.originalAmount - outstanding;
  return paid > 0 ? 'partial' : 'outstanding';
}

export interface LoanSummary {
  totalLent: number;
  outstanding: number;
  recovered: number;
  peopleOwing: number;
}

export function getLoanSummary(loans: Loan[], repayments: LoanRepayment[]): LoanSummary {
  const totalLent = loans.reduce((sum, l) => sum + l.originalAmount, 0);
  const outstanding = loans.reduce((sum, l) => sum + Math.max(getLoanOutstanding(l, repayments), 0), 0);
  const recovered = totalLent - outstanding;
  const peopleOwing = loans.filter((l) => getLoanOutstanding(l, repayments) > 0).length;
  return { totalLent, outstanding, recovered, peopleOwing };
}

export function getForgottenResolvedAmount(entry: ForgottenEntry, transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense' && t.forgottenId === entry.id)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getForgottenOutstanding(entry: ForgottenEntry, transactions: Transaction[]): number {
  return entry.amount - getForgottenResolvedAmount(entry, transactions);
}

export function getForgottenStatus(entry: ForgottenEntry, transactions: Transaction[]): ForgottenStatus {
  const outstanding = getForgottenOutstanding(entry, transactions);
  if (outstanding <= 0) return 'resolved';
  const resolved = getForgottenResolvedAmount(entry, transactions);
  return resolved > 0 ? 'partial' : 'unresolved';
}

export interface ForgottenSummary {
  totalForgotten: number;
  outstanding: number;
  resolved: number;
  unresolvedCount: number;
}

export function getForgottenSummary(entries: ForgottenEntry[], transactions: Transaction[]): ForgottenSummary {
  const totalForgotten = entries.reduce((sum, e) => sum + e.amount, 0);
  const outstanding = entries.reduce((sum, e) => sum + Math.max(getForgottenOutstanding(e, transactions), 0), 0);
  const resolved = totalForgotten - outstanding;
  const unresolvedCount = entries.filter((e) => getForgottenOutstanding(e, transactions) > 0).length;
  return { totalForgotten, outstanding, resolved, unresolvedCount };
}

// ---------------------------------------------------------------------------
// Streaks: tracking-consistency, not spending behavior. A day "counts" if a
// daily_tracking row exists for it (explicit mark-complete, a grace day, or
// automatically because the user recorded something that day).
// ---------------------------------------------------------------------------

export function getCurrentStreak(trackedDates: Set<string>, today: string = todayISO()): number {
  let cursor = trackedDates.has(today) ? today : addDays(today, -1);
  if (!trackedDates.has(cursor)) return 0;
  let count = 0;
  while (trackedDates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function getLongestStreak(trackedDates: Set<string>): number {
  if (trackedDates.size === 0) return 0;
  const sorted = Array.from(trackedDates).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export function trackedDatesSet(tracking: DailyTracking[]): Set<string> {
  return new Set(tracking.map((t) => t.date));
}

export interface CategoryTotal {
  categoryId: string;
  amount: number;
  percent: number;
}

export function getCategorySpending(transactions: Transaction[]): CategoryTotal[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.categoryId);
  const total = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totals = new Map<string, number>();
  for (const t of expenses) {
    const key = t.categoryId as string;
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface BudgetUsage {
  spent: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
}

export function getBudgetUsage(budget: Budget, transactions: Transaction[]): BudgetUsage {
  const relevant = transactions.filter(
    (t) => t.type === 'expense' && (budget.categoryId === null || t.categoryId === budget.categoryId)
  );
  const spent = relevant.reduce((sum, t) => sum + t.amount, 0);
  const remaining = budget.amount - spent;
  const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  return {
    spent,
    remaining,
    percentUsed,
    isExceeded: spent > budget.amount,
  };
}

export function getBudgetRemaining(budget: Budget, transactions: Transaction[]): number {
  return getBudgetUsage(budget, transactions).remaining;
}

export interface MonthlyComparison {
  current: number;
  previous: number;
  percentChange: number;
}

export function getMonthlyComparison(
  currentMonthExpenses: number,
  previousMonthExpenses: number
): MonthlyComparison {
  const percentChange =
    previousMonthExpenses > 0
      ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
      : currentMonthExpenses > 0
        ? 100
        : 0;
  return {
    current: currentMonthExpenses,
    previous: previousMonthExpenses,
    percentChange,
  };
}

export function getDailyAverage(transactions: Transaction[], daysElapsed: number): number {
  if (daysElapsed <= 0) return 0;
  return getTotalExpenses(transactions) / daysElapsed;
}

export function getSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

export function getUpcomingBills<T extends { dueDate: string; isPaid: boolean }>(
  bills: T[],
  withinDays = 14
): T[] {
  const today = todayISO();
  return bills
    .filter((b) => !b.isPaid && daysBetween(today, b.dueDate) >= 0 && daysBetween(today, b.dueDate) <= withinDays)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getRecurringExpensesTotal(
  recurring: { type: 'expense' | 'income'; amount: number; frequency: string; isActive: boolean }[]
): number {
  return recurring
    .filter((r) => r.isActive && r.type === 'expense')
    .reduce((sum, r) => {
      const monthlyFactor =
        r.frequency === 'daily' ? 30 : r.frequency === 'weekly' ? 4.33 : r.frequency === 'yearly' ? 1 / 12 : 1;
      return sum + r.amount * monthlyFactor;
    }, 0);
}

export interface MonthlyStatement {
  openingBalance: number;
  income: number;
  expenses: number;
  lent: number;
  repaid: number;
  closingBalance: number;
}

function netTransactionEffect(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === 'income' || t.type === 'repayment') return sum + t.amount;
    if (t.type === 'expense' || t.type === 'lent') return sum - t.amount;
    return sum; // transfers net to zero across all accounts combined
  }, 0);
}

export function getMonthlyStatement(
  transactions: Transaction[],
  accounts: Account[],
  monthDate: Date
): MonthlyStatement {
  const key = monthKey(monthDate);
  const monthStart = `${key}-01`;
  const priorTransactions = transactions.filter((t) => t.date < monthStart);
  const monthTransactions = transactions.filter((t) => t.date.slice(0, 7) === key);

  const startingBalance = accounts.filter((a) => a.isActive).reduce((sum, a) => sum + a.initialBalance, 0);
  const openingBalance = startingBalance + netTransactionEffect(priorTransactions);

  const income = getTotalIncome(monthTransactions);
  const expenses = getTotalExpenses(monthTransactions);
  const lent = getTotalLent(monthTransactions);
  const repaid = getTotalRepaid(monthTransactions);
  const closingBalance = openingBalance + income - expenses - lent + repaid;

  return { openingBalance, income, expenses, lent, repaid, closingBalance };
}

export interface MoneyWentSummary {
  income: number;
  spent: number;
  lent: number;
  remaining: number;
  recurringTotal: number;
}

export function getMoneyWentSummary(
  monthTransactions: Transaction[],
  recurring: { type: 'expense' | 'income'; amount: number; frequency: string; isActive: boolean }[]
): MoneyWentSummary {
  const income = getTotalIncome(monthTransactions);
  const spent = getTotalExpenses(monthTransactions);
  const lent = getTotalLent(monthTransactions);
  return {
    income,
    spent,
    lent,
    remaining: income - spent - lent,
    recurringTotal: getRecurringExpensesTotal(recurring),
  };
}

export function getNetWorth(accounts: Account[]): number {
  return accounts.filter((a) => a.isActive).reduce((sum, a) => {
    const isLiability = a.type === 'credit_card';
    return sum + (isLiability ? -a.balance : a.balance);
  }, 0);
}

export interface GoalProgress {
  percent: number;
  remaining: number;
  requiredMonthlyContribution: number | null;
}

export function getGoalProgress(goal: Goal): GoalProgress {
  const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  let requiredMonthlyContribution: number | null = null;
  if (goal.targetDate) {
    const monthsLeft = Math.max(
      1,
      Math.ceil(daysBetween(todayISO(), goal.targetDate) / 30)
    );
    requiredMonthlyContribution = remaining / monthsLeft;
  }
  return { percent, remaining, requiredMonthlyContribution };
}

export function getGoalMonthlyContribution(goal: Goal): number | null {
  return getGoalProgress(goal).requiredMonthlyContribution;
}

export type SpendingTrend = 'up' | 'down' | 'flat';

export function getSpendingTrend(currentMonth: number, previousMonth: number): SpendingTrend {
  if (previousMonth === 0 && currentMonth === 0) return 'flat';
  const change = getMonthlyComparison(currentMonth, previousMonth).percentChange;
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'flat';
}

export interface BudgetEngineSummary {
  monthlyBudget: number;
  spentThisMonth: number;
  remainingThisMonth: number;
  daysRemainingInMonth: number;
  dailyAllowance: number;
  weeklyAllowance: number;
  spentToday: number;
  safeToSpendToday: number;
  remainingToday: number;
  spentThisWeek: number;
}

/**
 * Monthly budget is the source of truth: daily/weekly allowances are always
 * derived from the remaining monthly budget, never set independently.
 */
export function getBudgetEngineSummary(
  monthlyBudget: number,
  transactions: Transaction[],
  now: Date,
  dateSystem: DateSystem = 'AD'
): BudgetEngineSummary {
  const monthTransactions = filterByMonth(transactions, now, dateSystem);
  const spentThisMonth = getTotalExpenses(monthTransactions);
  const remainingThisMonth = monthlyBudget - spentThisMonth;

  const daysInMonth =
    dateSystem === 'BS' ? getBsMonthInfo(now).daysInMonth : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = daysInMonth - getDayOfMonth(now, dateSystem) + 1;

  const dailyAllowance =
    daysRemainingInMonth > 0 ? Math.max(remainingThisMonth, 0) / daysRemainingInMonth : 0;
  const weeklyAllowance = dailyAllowance * 7;

  const spentToday = getTotalExpenses(filterByDay(transactions, now));
  const spentThisWeek = getTotalExpenses(filterByWeek(transactions, now));

  return {
    monthlyBudget,
    spentThisMonth,
    remainingThisMonth,
    daysRemainingInMonth,
    dailyAllowance,
    weeklyAllowance,
    spentToday,
    safeToSpendToday: dailyAllowance,
    remainingToday: dailyAllowance - spentToday,
    spentThisWeek,
  };
}

// ---------------------------------------------------------------------------
// Report periods: arbitrary Week/Month/Quarter/Year/Custom ranges, their
// equivalent "previous period" (for auto-comparison), and sub-range buckets
// for trend charts.
// ---------------------------------------------------------------------------

export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: string; // ISO, inclusive
  end: string; // ISO, inclusive
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function startOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}
function endOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 3, 0);
}
function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}
function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

/**
 * `dateSystem` only changes 'month' and 'year': BS months/years don't align
 * with Gregorian ones (e.g. Ashwin = Sep 17-Oct 17), so those two periods are
 * resolved against real BS boundaries. Week is a fixed 7-day span and
 * quarter has no BS equivalent in this product, so both stay Gregorian
 * regardless of `dateSystem`. The returned range is always canonical
 * Gregorian ISO, since that's how transactions are stored.
 */
export function getPeriodRange(
  period: ReportPeriod,
  referenceDate: Date,
  custom?: DateRange,
  dateSystem: DateSystem = 'AD'
): DateRange {
  if (period === 'custom') return custom ?? getPeriodRange('month', referenceDate, undefined, dateSystem);
  if (period === 'week') {
    const start = startOfWeek(referenceDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toISODate(start), end: toISODate(end) };
  }
  if (period === 'quarter') {
    return { start: toISODate(startOfQuarter(referenceDate)), end: toISODate(endOfQuarter(referenceDate)) };
  }
  if (period === 'year') {
    if (dateSystem === 'BS') {
      const info = getBsYearInfo(referenceDate);
      return { start: info.firstDayAdIso, end: info.lastDayAdIso };
    }
    return { start: toISODate(startOfYear(referenceDate)), end: toISODate(endOfYear(referenceDate)) };
  }
  if (dateSystem === 'BS') {
    const info = getBsMonthInfo(referenceDate);
    return { start: info.firstDayAdIso, end: addDays(info.firstDayAdIso, info.daysInMonth - 1) };
  }
  return { start: toISODate(startOfMonth(referenceDate)), end: toISODate(endOfMonth(referenceDate)) };
}

/** The equivalent immediately-preceding period, used to drive auto-comparison deltas. */
export function getPreviousPeriodRange(period: ReportPeriod, range: DateRange, dateSystem: DateSystem = 'AD'): DateRange {
  const start = new Date(range.start + 'T00:00:00');
  if (period === 'month') return getPeriodRange('month', shiftMonth(start, -1, dateSystem), undefined, dateSystem);
  if (period === 'quarter') return getPeriodRange('quarter', new Date(start.getFullYear(), start.getMonth() - 3, 1));
  if (period === 'year') return getPeriodRange('year', shiftYear(start, -1, dateSystem), undefined, dateSystem);

  // week / custom: shift back by the range's exact day-length
  const end = new Date(range.end + 'T00:00:00');
  const lengthDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (lengthDays - 1));
  return { start: toISODate(prevStart), end: toISODate(prevEnd) };
}

export function getSameRangeLastYear(range: DateRange): DateRange {
  const shift = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    d.setFullYear(d.getFullYear() - 1);
    return toISODate(d);
  };
  return { start: shift(range.start), end: shift(range.end) };
}

export function filterByRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => t.date >= range.start && t.date <= range.end);
}

/** Sub-ranges for trend charts: daily for a week, weekly for a month, monthly for a quarter/year. */
export function getPeriodBuckets(period: ReportPeriod, range: DateRange): DateRange[] {
  const start = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T00:00:00');
  if (end < start) return [];

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d > end) return null;
      const iso = toISODate(d);
      return { start: iso, end: iso };
    }).filter((b): b is DateRange => b !== null);
  }

  if (period === 'quarter' || period === 'year') {
    const buckets: DateRange[] = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const bucketEnd = endOfMonth(cursor);
      buckets.push({
        start: toISODate(cursor > start ? cursor : start),
        end: toISODate(bucketEnd < end ? bucketEnd : end),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return buckets;
  }

  // month / custom: weekly buckets clipped to the range
  const buckets: DateRange[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + 6);
    buckets.push({
      start: toISODate(cursor),
      end: toISODate(bucketEnd > end ? end : bucketEnd),
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Forgotten Money: overdue/stale loans, and goals/accounts that haven't been
// touched in a while.
// ---------------------------------------------------------------------------

const STALE_LOAN_DAYS = 60;
const IDLE_GOAL_DAYS = 30;
const IDLE_ACCOUNT_DAYS = 60;

export interface ForgottenLoan {
  loan: Loan;
  outstanding: number;
  reason: 'overdue' | 'stale';
  daysSince: number;
}

export function getForgottenLoans(
  loans: Loan[],
  repayments: LoanRepayment[],
  today: string = todayISO()
): ForgottenLoan[] {
  const result: ForgottenLoan[] = [];
  for (const loan of loans) {
    if (getLoanStatus(loan, repayments) === 'repaid') continue;
    const outstanding = getLoanOutstanding(loan, repayments);
    if (loan.expectedReturnDate && loan.expectedReturnDate < today) {
      result.push({ loan, outstanding, reason: 'overdue', daysSince: daysBetween(loan.expectedReturnDate, today) });
    } else if (!loan.expectedReturnDate && daysBetween(loan.lentDate, today) > STALE_LOAN_DAYS) {
      result.push({ loan, outstanding, reason: 'stale', daysSince: daysBetween(loan.lentDate, today) });
    }
  }
  return result.sort((a, b) => b.daysSince - a.daysSince);
}

export interface IdleGoal {
  goal: Goal;
  daysSinceUpdate: number;
}

export function getIdleGoals(
  goals: Goal[],
  today: string = todayISO(),
  thresholdDays: number = IDLE_GOAL_DAYS
): IdleGoal[] {
  return goals
    .filter((g) => g.currentAmount < g.targetAmount)
    .map((g) => ({ goal: g, daysSinceUpdate: daysBetween(g.updatedAt.slice(0, 10), today) }))
    .filter((g) => g.daysSinceUpdate >= thresholdDays)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

export interface IdleAccount {
  account: Account;
  daysSinceActivity: number | null;
}

export function getIdleAccounts(
  accounts: Account[],
  transactions: Transaction[],
  today: string = todayISO(),
  thresholdDays: number = IDLE_ACCOUNT_DAYS
): IdleAccount[] {
  const result: IdleAccount[] = [];
  for (const account of accounts) {
    if (!account.isActive || account.balance === 0) continue;
    const relevant = transactions.filter((t) => t.accountId === account.id || t.toAccountId === account.id);
    if (relevant.length === 0) {
      const daysSinceCreated = daysBetween(account.createdAt.slice(0, 10), today);
      if (daysSinceCreated >= thresholdDays) result.push({ account, daysSinceActivity: null });
      continue;
    }
    const lastDate = relevant.reduce((max, t) => (t.date > max ? t.date : max), relevant[0].date);
    const daysSince = daysBetween(lastDate, today);
    if (daysSince >= thresholdDays) result.push({ account, daysSinceActivity: daysSince });
  }
  return result.sort((a, b) => (b.daysSinceActivity ?? Infinity) - (a.daysSinceActivity ?? Infinity));
}
