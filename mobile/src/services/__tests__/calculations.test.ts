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
} from '../calculations';
import type { Account, Budget, Goal, Transaction } from '../../types';

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
    recurringId: null,
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
