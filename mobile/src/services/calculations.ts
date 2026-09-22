import type { Account, Budget, Goal, Loan, LoanRepayment, LoanStatus, Transaction } from '../types';
import { daysBetween, isSameDay, isSameWeek, monthKey, todayISO } from '../utils/date';

export function getTotalBalance(accounts: Account[]): number {
  return accounts.filter((a) => a.isActive).reduce((sum, a) => sum + a.balance, 0);
}

export function filterByMonth(transactions: Transaction[], date: Date): Transaction[] {
  const key = monthKey(date);
  return transactions.filter((t) => t.date.slice(0, 7) === key);
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
  now: Date
): BudgetEngineSummary {
  const monthTransactions = filterByMonth(transactions, now);
  const spentThisMonth = getTotalExpenses(monthTransactions);
  const remainingThisMonth = monthlyBudget - spentThisMonth;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = daysInMonth - now.getDate() + 1;

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
