import {
  getTotalBalance,
  getTotalIncome,
  getTotalExpenses,
  getNetCashFlow,
  getCategorySpending,
  getBudgetUsage,
  getMonthlyComparison,
  getDailyAverage,
  getSavingsRate,
  getUpcomingBills,
  getRecurringExpensesTotal,
  getNetWorth,
  getGoalProgress,
  getSpendingTrend,
  getTotalLent,
  getTotalRepaid,
  getLoanOutstanding,
  getLoanStatus,
  getLoanSummary,
  getMonthlyStatement,
  getMoneyWentSummary,
  getPeriodRange,
  getPreviousPeriodRange,
  getSameRangeLastYear,
  getPeriodBuckets,
  getForgottenLoans,
  getIdleGoals,
  getIdleAccounts,
  getForgottenOutstanding,
  getForgottenStatus,
  getForgottenSummary,
  getCurrentStreak,
  getLongestStreak,
} from '../calculations';
import { adIsoToBs, bsToAdIso, BS_MONTH_NAMES, getMonthGrid, shiftMonth } from '../../utils/bsDate';
import { toISODate } from '../../utils/date';
import type { Account, Budget, ForgottenEntry, Goal, Loan, LoanRepayment, Transaction } from '../../types';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx1',
    type: 'expense',
    amount: 100,
    accountId: 'acc1',
    toAccountId: null,
    categoryId: 'cat1',
    title: 'Test',
    notes: null,
    date: '2026-09-01',
    time: '12:00',
    recurringId: null,
    loanId: null,
    forgottenId: null,
    affectsBalance: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'acc1',
    name: 'Cash',
    type: 'cash',
    balance: 1000,
    initialBalance: 1000,
    currency: 'NPR',
    color: '#000',
    icon: 'cash',
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getTotalBalance', () => {
  it('sums only active accounts', () => {
    const accounts = [
      makeAccount({ id: 'a', balance: 500 }),
      makeAccount({ id: 'b', balance: 300, isActive: false }),
      makeAccount({ id: 'c', balance: 200 }),
    ];
    expect(getTotalBalance(accounts)).toBe(700);
  });
});

describe('income / expenses / cash flow', () => {
  const transactions = [
    makeTransaction({ id: '1', type: 'income', amount: 65000 }),
    makeTransaction({ id: '2', type: 'expense', amount: 4500 }),
    makeTransaction({ id: '3', type: 'expense', amount: 1200 }),
    makeTransaction({ id: '4', type: 'transfer', amount: 10000, toAccountId: 'acc2' }),
  ];

  it('getTotalIncome ignores expenses/transfers', () => {
    expect(getTotalIncome(transactions)).toBe(65000);
  });

  it('getTotalExpenses ignores income/transfers', () => {
    expect(getTotalExpenses(transactions)).toBe(5700);
  });

  it('getNetCashFlow is income minus expenses', () => {
    expect(getNetCashFlow(transactions)).toBe(59300);
  });
});

describe('getCategorySpending', () => {
  it('groups expenses by category and computes percent share', () => {
    const transactions = [
      makeTransaction({ id: '1', categoryId: 'food', amount: 300 }),
      makeTransaction({ id: '2', categoryId: 'food', amount: 200 }),
      makeTransaction({ id: '3', categoryId: 'transport', amount: 500 }),
      makeTransaction({ id: '4', type: 'income', categoryId: 'food', amount: 999 }),
    ];
    const result = getCategorySpending(transactions);
    expect(result).toEqual([
      { categoryId: 'food', amount: 500, percent: 50 },
      { categoryId: 'transport', amount: 500, percent: 50 },
    ]);
  });
});

describe('getBudgetUsage', () => {
  const budget: Budget = {
    id: 'b1',
    categoryId: 'food',
    amount: 15000,
    period: 'monthly',
    createdAt: '2026-09-01T00:00:00.000Z',
  };

  it('computes spent, remaining and percent used for a category budget', () => {
    const transactions = [
      makeTransaction({ id: '1', categoryId: 'food', amount: 12300 }),
      makeTransaction({ id: '2', categoryId: 'transport', amount: 6400 }),
    ];
    const usage = getBudgetUsage(budget, transactions);
    expect(usage.spent).toBe(12300);
    expect(usage.remaining).toBe(2700);
    expect(usage.percentUsed).toBeCloseTo(82, 0);
    expect(usage.isExceeded).toBe(false);
  });

  it('flags isExceeded when spending passes the budget amount', () => {
    const transactions = [makeTransaction({ id: '1', categoryId: 'food', amount: 20000 })];
    expect(getBudgetUsage(budget, transactions).isExceeded).toBe(true);
  });

  it('treats a null categoryId budget as an overall budget across all expenses', () => {
    const overall: Budget = { ...budget, categoryId: null, amount: 50000 };
    const transactions = [
      makeTransaction({ id: '1', categoryId: 'food', amount: 12300 }),
      makeTransaction({ id: '2', categoryId: 'transport', amount: 6400 }),
    ];
    expect(getBudgetUsage(overall, transactions).spent).toBe(18700);
  });
});

describe('getMonthlyComparison', () => {
  it('computes percent change relative to the previous month', () => {
    const result = getMonthlyComparison(38240, 43450);
    expect(result.percentChange).toBeCloseTo(-11.99, 1);
  });

  it('treats spending from zero as a 100% increase', () => {
    expect(getMonthlyComparison(500, 0).percentChange).toBe(100);
  });

  it('is flat when both months are zero', () => {
    expect(getMonthlyComparison(0, 0).percentChange).toBe(0);
  });
});

describe('getDailyAverage', () => {
  it('divides total expenses by days elapsed', () => {
    const transactions = [makeTransaction({ amount: 3822 })];
    expect(getDailyAverage(transactions, 3)).toBeCloseTo(1274, 0);
  });

  it('returns 0 when no days have elapsed', () => {
    expect(getDailyAverage([], 0)).toBe(0);
  });
});

describe('getSavingsRate', () => {
  it('computes the percentage of income retained', () => {
    expect(getSavingsRate(65000, 38240)).toBeCloseTo(41.17, 1);
  });

  it('returns 0 when there is no income', () => {
    expect(getSavingsRate(0, 500)).toBe(0);
  });
});

describe('getUpcomingBills', () => {
  const realToday = Date.now;
  beforeAll(() => {
    Date.now = () => new Date('2026-09-06T00:00:00.000Z').getTime();
  });
  afterAll(() => {
    Date.now = realToday;
  });

  it('excludes paid bills and bills outside the window', () => {
    const bills = [
      { id: '1', dueDate: '2026-09-10', isPaid: false },
      { id: '2', dueDate: '2026-09-08', isPaid: true },
      { id: '3', dueDate: '2026-10-20', isPaid: false },
      { id: '4', dueDate: '2026-09-01', isPaid: false },
    ];
    const upcoming = getUpcomingBills(bills, 14);
    expect(upcoming.map((b) => b.id)).toEqual(['1']);
  });
});

describe('getRecurringExpensesTotal', () => {
  it('normalizes recurring expenses to a monthly figure', () => {
    const recurring = [
      { type: 'expense' as const, amount: 1200, frequency: 'monthly', isActive: true },
      { type: 'expense' as const, amount: 100, frequency: 'daily', isActive: true },
      { type: 'income' as const, amount: 65000, frequency: 'monthly', isActive: true },
      { type: 'expense' as const, amount: 500, frequency: 'monthly', isActive: false },
    ];
    expect(getRecurringExpensesTotal(recurring)).toBeCloseTo(1200 + 100 * 30, 0);
  });
});

describe('getNetWorth', () => {
  it('subtracts credit card balances as liabilities', () => {
    const accounts = [
      makeAccount({ id: 'a', type: 'cash', balance: 10000 }),
      makeAccount({ id: 'b', type: 'credit_card', balance: 3000 }),
    ];
    expect(getNetWorth(accounts)).toBe(7000);
  });
});

describe('getGoalProgress', () => {
  const realToday = Date.now;
  beforeAll(() => {
    Date.now = () => new Date('2026-09-06T00:00:00.000Z').getTime();
  });
  afterAll(() => {
    Date.now = realToday;
  });

  it('computes percent complete and remaining amount', () => {
    const goal: Goal = {
      id: 'g1',
      name: 'Emergency Fund',
      targetAmount: 100000,
      currentAmount: 32000,
      targetDate: null,
      icon: 'shield',
      color: '#000',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const progress = getGoalProgress(goal);
    expect(progress.percent).toBe(32);
    expect(progress.remaining).toBe(68000);
    expect(progress.requiredMonthlyContribution).toBeNull();
  });

  it('computes required monthly contribution when a target date is set', () => {
    const goal: Goal = {
      id: 'g1',
      name: 'Emergency Fund',
      targetAmount: 100000,
      currentAmount: 32000,
      targetDate: '2026-12-05',
      icon: 'shield',
      updatedAt: '2026-09-01T00:00:00.000Z',
      color: '#000',
      createdAt: '2026-09-01T00:00:00.000Z',
    };
    const progress = getGoalProgress(goal);
    expect(progress.requiredMonthlyContribution).toBeCloseTo(68000 / 3, 0);
  });
});

describe('getSpendingTrend', () => {
  it('reports up when spending rises more than 5%', () => {
    expect(getSpendingTrend(1100, 1000)).toBe('up');
  });

  it('reports down when spending falls more than 5%', () => {
    expect(getSpendingTrend(800, 1000)).toBe('down');
  });

  it('reports flat for small changes', () => {
    expect(getSpendingTrend(1020, 1000)).toBe('flat');
  });
});

function makeLoan(overrides: Partial<Loan>): Loan {
  return {
    id: 'loan1',
    personName: 'Ram',
    originalAmount: 5000,
    lentDate: '2026-09-01',
    expectedReturnDate: '2026-09-30',
    reason: null,
    note: null,
    accountId: 'acc1',
    reminderEnabled: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRepayment(overrides: Partial<LoanRepayment>): LoanRepayment {
  return {
    id: 'rep1',
    loanId: 'loan1',
    amount: 1000,
    date: '2026-09-10',
    accountId: 'acc1',
    note: null,
    createdAt: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal>): Goal {
  return {
    id: 'goal1',
    name: 'Emergency Fund',
    targetAmount: 100000,
    currentAmount: 32000,
    targetDate: null,
    icon: 'shield',
    color: '#000',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getTotalLent / getTotalRepaid', () => {
  it('sums only lent/repayment transactions', () => {
    const transactions = [
      makeTransaction({ id: '1', type: 'lent', amount: 5000, categoryId: null }),
      makeTransaction({ id: '2', type: 'repayment', amount: 2000, categoryId: null }),
      makeTransaction({ id: '3', type: 'expense', amount: 300 }),
    ];
    expect(getTotalLent(transactions)).toBe(5000);
    expect(getTotalRepaid(transactions)).toBe(2000);
  });
});

describe('loan outstanding / status / summary', () => {
  it('computes outstanding as originalAmount minus repayments for that loan', () => {
    const loan = makeLoan({});
    const repayments = [
      makeRepayment({ id: 'r1', loanId: 'loan1', amount: 1000 }),
      makeRepayment({ id: 'r2', loanId: 'loan1', amount: 1500 }),
      makeRepayment({ id: 'r3', loanId: 'other-loan', amount: 9999 }),
    ];
    expect(getLoanOutstanding(loan, repayments)).toBe(2500);
  });

  it('reports outstanding/partial/repaid status correctly', () => {
    const loan = makeLoan({ originalAmount: 1000 });
    expect(getLoanStatus(loan, [])).toBe('outstanding');
    expect(getLoanStatus(loan, [makeRepayment({ amount: 400 })])).toBe('partial');
    expect(getLoanStatus(loan, [makeRepayment({ amount: 1000 })])).toBe('repaid');
  });

  it('summarizes total lent, outstanding, recovered and people owing across loans', () => {
    const loans = [
      makeLoan({ id: 'a', originalAmount: 5000 }),
      makeLoan({ id: 'b', originalAmount: 3000 }),
    ];
    const repayments = [
      makeRepayment({ id: 'r1', loanId: 'a', amount: 5000 }), // fully repaid
      makeRepayment({ id: 'r2', loanId: 'b', amount: 1000 }), // partially repaid
    ];
    const summary = getLoanSummary(loans, repayments);
    expect(summary.totalLent).toBe(8000);
    expect(summary.recovered).toBe(6000);
    expect(summary.outstanding).toBe(2000);
    expect(summary.peopleOwing).toBe(1);
  });
});

describe('getMonthlyStatement', () => {
  it('computes opening/closing balance from prior and current month transactions', () => {
    const accounts = [makeAccount({ id: 'acc1', initialBalance: 20000 })];
    const transactions = [
      makeTransaction({ id: '1', type: 'income', amount: 10000, date: '2026-08-15' }),
      makeTransaction({ id: '2', type: 'income', amount: 50000, date: '2026-09-05' }),
      makeTransaction({ id: '3', type: 'expense', amount: 32450, date: '2026-09-10' }),
      makeTransaction({ id: '4', type: 'lent', amount: 5000, date: '2026-09-12', categoryId: null }),
      makeTransaction({ id: '5', type: 'repayment', amount: 2000, date: '2026-09-20', categoryId: null }),
    ];
    const statement = getMonthlyStatement(transactions, accounts, new Date('2026-09-15'));
    expect(statement.openingBalance).toBe(30000);
    expect(statement.income).toBe(50000);
    expect(statement.expenses).toBe(32450);
    expect(statement.lent).toBe(5000);
    expect(statement.repaid).toBe(2000);
    expect(statement.closingBalance).toBe(30000 + 50000 - 32450 - 5000 + 2000);
  });
});

describe('getMoneyWentSummary', () => {
  it('computes remaining as income minus spent minus lent, and includes recurring total', () => {
    const transactions = [
      makeTransaction({ id: '1', type: 'income', amount: 50000 }),
      makeTransaction({ id: '2', type: 'expense', amount: 32450 }),
      makeTransaction({ id: '3', type: 'lent', amount: 5000, categoryId: null }),
    ];
    const recurring = [{ type: 'expense' as const, amount: 1200, frequency: 'monthly', isActive: true }];
    const summary = getMoneyWentSummary(transactions, recurring);
    expect(summary.income).toBe(50000);
    expect(summary.spent).toBe(32450);
    expect(summary.lent).toBe(5000);
    expect(summary.remaining).toBe(12550);
    expect(summary.recurringTotal).toBe(1200);
  });
});

describe('getPeriodRange', () => {
  it('computes calendar month/quarter/year bounds', () => {
    const ref = new Date('2026-09-15');
    expect(getPeriodRange('month', ref)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(getPeriodRange('quarter', ref)).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(getPeriodRange('year', ref)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });

  it('computes a Monday-start week range', () => {
    // 2026-09-15 is a Tuesday
    expect(getPeriodRange('week', new Date('2026-09-15'))).toEqual({ start: '2026-09-14', end: '2026-09-20' });
  });

  it('falls back to custom range when provided', () => {
    const custom = { start: '2026-01-05', end: '2026-01-10' };
    expect(getPeriodRange('custom', new Date('2026-09-15'), custom)).toEqual(custom);
  });
});

describe('getPreviousPeriodRange', () => {
  it('steps to the previous calendar month/quarter/year', () => {
    expect(getPreviousPeriodRange('month', { start: '2026-09-01', end: '2026-09-30' })).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
    expect(getPreviousPeriodRange('quarter', { start: '2026-07-01', end: '2026-09-30' })).toEqual({
      start: '2026-04-01',
      end: '2026-06-30',
    });
    expect(getPreviousPeriodRange('year', { start: '2026-01-01', end: '2026-12-31' })).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
  });

  it('shifts a week range back by its exact length', () => {
    expect(getPreviousPeriodRange('week', { start: '2026-09-14', end: '2026-09-20' })).toEqual({
      start: '2026-09-07',
      end: '2026-09-13',
    });
  });
});

describe('getSameRangeLastYear', () => {
  it('shifts both endpoints back one calendar year', () => {
    expect(getSameRangeLastYear({ start: '2026-09-01', end: '2026-09-30' })).toEqual({
      start: '2025-09-01',
      end: '2025-09-30',
    });
  });
});

describe('getPeriodBuckets', () => {
  it('returns 7 daily buckets for a week', () => {
    const buckets = getPeriodBuckets('week', { start: '2026-09-14', end: '2026-09-20' });
    expect(buckets).toHaveLength(7);
    expect(buckets[0]).toEqual({ start: '2026-09-14', end: '2026-09-14' });
    expect(buckets[6]).toEqual({ start: '2026-09-20', end: '2026-09-20' });
  });

  it('returns monthly buckets clipped to range for a year', () => {
    const buckets = getPeriodBuckets('year', { start: '2026-01-01', end: '2026-12-31' });
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toEqual({ start: '2026-01-01', end: '2026-01-31' });
    expect(buckets[11]).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('returns weekly buckets clipped to range for a month', () => {
    const buckets = getPeriodBuckets('month', { start: '2026-09-01', end: '2026-09-30' });
    expect(buckets[0].start).toBe('2026-09-01');
    expect(buckets[buckets.length - 1].end).toBe('2026-09-30');
  });
});

describe('getForgottenLoans', () => {
  it('flags loans past their expected return date as overdue', () => {
    const loan = makeLoan({ expectedReturnDate: '2026-09-01' });
    const result = getForgottenLoans([loan], [], '2026-09-15');
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('overdue');
    expect(result[0].daysSince).toBe(14);
  });

  it('flags loans with no return date as stale after 60 days', () => {
    const loan = makeLoan({ expectedReturnDate: null, lentDate: '2026-06-01' });
    const result = getForgottenLoans([loan], [], '2026-09-15');
    expect(result[0].reason).toBe('stale');
  });

  it('excludes fully repaid loans', () => {
    const loan = makeLoan({ expectedReturnDate: '2026-09-01', originalAmount: 1000 });
    const repayments = [makeRepayment({ amount: 1000 })];
    expect(getForgottenLoans([loan], repayments, '2026-09-15')).toHaveLength(0);
  });

  it('does not flag a loan still within its return window', () => {
    const loan = makeLoan({ expectedReturnDate: '2026-09-30' });
    expect(getForgottenLoans([loan], [], '2026-09-15')).toHaveLength(0);
  });
});

describe('getIdleGoals', () => {
  it('flags incomplete goals not touched in 30+ days', () => {
    const goal = makeGoal({ updatedAt: '2026-08-01T00:00:00.000Z', currentAmount: 5000, targetAmount: 10000 });
    const result = getIdleGoals([goal], '2026-09-15');
    expect(result).toHaveLength(1);
    expect(result[0].daysSinceUpdate).toBe(45);
  });

  it('excludes completed goals and recently-touched goals', () => {
    const completed = makeGoal({ updatedAt: '2026-08-01T00:00:00.000Z', currentAmount: 10000, targetAmount: 10000 });
    const recent = makeGoal({ id: 'g2', updatedAt: '2026-09-10T00:00:00.000Z', currentAmount: 100, targetAmount: 10000 });
    expect(getIdleGoals([completed, recent], '2026-09-15')).toHaveLength(0);
  });
});

describe('getIdleAccounts', () => {
  it('flags active accounts with a balance and no recent transactions', () => {
    const account = makeAccount({ id: 'a1', isActive: true, balance: 5000 });
    const transactions = [makeTransaction({ id: '1', accountId: 'a1', date: '2026-07-01' })];
    const result = getIdleAccounts([account], transactions, '2026-09-15');
    expect(result).toHaveLength(1);
    expect(result[0].daysSinceActivity).toBe(76);
  });

  it('excludes accounts with recent activity, zero balance, or that are inactive', () => {
    const active = makeAccount({ id: 'a1', isActive: true, balance: 5000 });
    const zero = makeAccount({ id: 'a2', isActive: true, balance: 0 });
    const inactive = makeAccount({ id: 'a3', isActive: false, balance: 5000 });
    const transactions = [makeTransaction({ id: '1', accountId: 'a1', date: '2026-09-10' })];
    expect(getIdleAccounts([active, zero, inactive], transactions, '2026-09-15')).toHaveLength(0);
  });
});

function makeForgottenEntry(overrides: Partial<ForgottenEntry>): ForgottenEntry {
  return {
    id: 'forgot1',
    amount: 2000,
    date: '2026-09-18',
    accountId: 'acc1',
    note: null,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('Forgotten Money: outstanding / status / summary', () => {
  it('is unresolved with no resolution transactions', () => {
    const entry = makeForgottenEntry({});
    expect(getForgottenOutstanding(entry, [])).toBe(2000);
    expect(getForgottenStatus(entry, [])).toBe('unresolved');
  });

  it('is partial when some but not all of the amount is resolved into real expenses', () => {
    const entry = makeForgottenEntry({ amount: 2000 });
    const transactions = [
      makeTransaction({ id: 'r1', type: 'expense', amount: 1200, forgottenId: 'forgot1', categoryId: 'food' }),
    ];
    expect(getForgottenOutstanding(entry, transactions)).toBe(800);
    expect(getForgottenStatus(entry, transactions)).toBe('partial');
  });

  it('is resolved once resolutions cover the full amount, using multiple categorized line items', () => {
    const entry = makeForgottenEntry({ amount: 2000 });
    const transactions = [
      makeTransaction({ id: 'r1', type: 'expense', amount: 1200, forgottenId: 'forgot1', categoryId: 'food' }),
      makeTransaction({ id: 'r2', type: 'expense', amount: 800, forgottenId: 'forgot1', categoryId: 'transport' }),
    ];
    expect(getForgottenOutstanding(entry, transactions)).toBe(0);
    expect(getForgottenStatus(entry, transactions)).toBe('resolved');
  });

  it('ignores the placeholder "forgotten" transaction itself and transactions for other entries', () => {
    const entry = makeForgottenEntry({ amount: 2000 });
    const transactions = [
      makeTransaction({ id: 'forgot1', type: 'forgotten', amount: 2000, forgottenId: 'forgot1', categoryId: null }),
      makeTransaction({ id: 'other', type: 'expense', amount: 500, forgottenId: 'some-other-entry' }),
    ];
    expect(getForgottenOutstanding(entry, transactions)).toBe(2000);
  });

  it('summarizes total/outstanding/resolved and count across entries', () => {
    const entries = [
      makeForgottenEntry({ id: 'a', amount: 2000 }),
      makeForgottenEntry({ id: 'b', amount: 5000 }),
    ];
    const transactions = [
      makeTransaction({ id: 'r1', type: 'expense', amount: 2000, forgottenId: 'a' }), // fully resolved
      makeTransaction({ id: 'r2', type: 'expense', amount: 3500, forgottenId: 'b' }), // partial
    ];
    const summary = getForgottenSummary(entries, transactions);
    expect(summary.totalForgotten).toBe(7000);
    expect(summary.resolved).toBe(5500);
    expect(summary.outstanding).toBe(1500);
    expect(summary.unresolvedCount).toBe(1);
  });
});

describe('Streaks: getCurrentStreak / getLongestStreak', () => {
  it('counts consecutive days ending today', () => {
    const tracked = new Set(['2026-09-13', '2026-09-14', '2026-09-15']);
    expect(getCurrentStreak(tracked, '2026-09-15')).toBe(3);
  });

  it('stays alive using yesterday when today is not tracked yet', () => {
    const tracked = new Set(['2026-09-13', '2026-09-14']);
    expect(getCurrentStreak(tracked, '2026-09-15')).toBe(2);
  });

  it('resets to 0 when a full day has passed untracked', () => {
    const tracked = new Set(['2026-09-10', '2026-09-11']);
    expect(getCurrentStreak(tracked, '2026-09-15')).toBe(0);
  });

  it('handles a streak that spans a month and year boundary', () => {
    const tracked = new Set(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
    expect(getCurrentStreak(tracked, '2026-01-02')).toBe(4);
  });

  it('longest streak survives a later reset and ignores non-consecutive gaps', () => {
    const tracked = new Set(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-10', '2026-09-15']);
    expect(getLongestStreak(tracked)).toBe(3);
  });

  it('longest streak is 0 for no tracked days', () => {
    expect(getLongestStreak(new Set())).toBe(0);
  });
});

describe('AD/BS date conversion', () => {
  it('round-trips a known AD date through BS and back', () => {
    const bs = adIsoToBs('2026-09-23');
    expect(bs.year).toBeGreaterThan(2000);
    const backToAd = bsToAdIso(bs.year, bs.month, bs.date);
    expect(backToAd).toBe('2026-09-23');
  });
});

describe('BS calendar grid', () => {
  it('builds a grid whose cells are true BS-month length, not a relabeled AD month', () => {
    const anchor = new Date('2026-09-23T00:00:00');
    const grid = getMonthGrid(anchor, 'BS');
    const dayCells = grid.cells.filter((c): c is NonNullable<typeof c> => c !== null);
    // BS months are always 29-32 days, never exactly a Gregorian month's length by coincidence every time.
    expect(dayCells.length).toBeGreaterThanOrEqual(29);
    expect(dayCells.length).toBeLessThanOrEqual(32);
    // Every cell's AD ISO date must actually fall in the BS month the label claims.
    for (const cell of dayCells) {
      const bs = adIsoToBs(cell.adIso);
      expect(`${BS_MONTH_NAMES[bs.month - 1]} ${bs.year}`).toBe(grid.label);
    }
    // Day numbers are sequential BS day-of-month, not the AD day-of-month.
    expect(dayCells.map((c) => c.dayNumber)).toEqual(dayCells.map((_, i) => i + 1));
  });

  it('builds a standard Gregorian grid in AD mode', () => {
    const grid = getMonthGrid(new Date('2026-09-15T00:00:00'), 'AD');
    const dayCells = grid.cells.filter((c): c is NonNullable<typeof c> => c !== null);
    expect(dayCells).toHaveLength(30);
    expect(grid.label).toBe('September 2026');
  });

  it('shiftMonth in BS mode moves by a true BS month, wrapping the BS year at month 12/1', () => {
    const anchor = new Date('2026-09-23T00:00:00'); // some BS month
    const bsBefore = adIsoToBs(toISODate(anchor));
    const shifted = shiftMonth(anchor, 1, 'BS');
    const bsAfter = adIsoToBs(toISODate(shifted));
    const expectedMonth = bsBefore.month === 12 ? 1 : bsBefore.month + 1;
    const expectedYear = bsBefore.month === 12 ? bsBefore.year + 1 : bsBefore.year;
    expect(bsAfter.month).toBe(expectedMonth);
    expect(bsAfter.year).toBe(expectedYear);
  });
});
