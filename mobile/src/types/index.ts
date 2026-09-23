export type CurrencyCode = 'NPR' | 'USD' | 'EUR' | 'GBP' | 'INR';

export type AccountType =
  | 'cash'
  | 'bank'
  | 'savings'
  | 'wallet'
  | 'credit_card'
  | 'investment'
  | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  currency: CurrencyCode;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryKind = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  isDefault: boolean;
  isEnabled: boolean;
  createdAt: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer' | 'lent' | 'repayment';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // always positive; sign/direction derived from `type`
  accountId: string;
  toAccountId: string | null; // only for transfers
  categoryId: string | null; // null for transfers, lent, and repayment
  title: string;
  notes: string | null;
  date: string; // ISO date (YYYY-MM-DD)
  time: string; // HH:mm, captured automatically at insert time
  recurringId: string | null; // set if generated from a recurring transaction
  loanId: string | null; // set if generated from a lent/repayment action
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  type: 'expense' | 'income';
  title: string;
  amount: number;
  accountId: string;
  categoryId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextOccurrence: string;
  reminderDays: number;
  isActive: boolean;
  createdAt: string;
}

export type BudgetPeriod = 'monthly';

export interface Budget {
  id: string;
  categoryId: string | null; // null = overall budget
  amount: number;
  period: BudgetPeriod;
  createdAt: string;
}

export interface Shortcut {
  id: string;
  label: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string | null;
  accountId: string;
  sortOrder: number;
  createdAt: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  recurringId: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type LoanStatus = 'outstanding' | 'partial' | 'repaid';

export interface Loan {
  id: string;
  personName: string;
  originalAmount: number;
  lentDate: string;
  expectedReturnDate: string | null;
  reason: string | null;
  note: string | null;
  accountId: string; // source of funds
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  accountId: string; // where the repayment lands
  note: string | null;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type ReminderFrequency = 'daily' | 'weekly' | 'monthly';

export interface AppSettings {
  currency: CurrencyCode;
  themeMode: ThemeMode;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  hideBalances: boolean;
  cloudBackupEnabled: boolean;
  cloudBackupIntervalDays: number;
  lastCloudBackupAt: string | null;
  expenseReminderEnabled: boolean;
  expenseReminderTime: string; // 'HH:mm'
  expenseReminderFrequency: ReminderFrequency;
  budgetAlertEnabled: boolean;
  budgetAlertThreshold: number; // percent
  recurringReminderEnabled: boolean;
  lentReminderEnabled: boolean;
  appLockEnabled: boolean;
  biometricLockEnabled: boolean;
}

export interface CategorySpending {
  categoryId: string;
  amount: number;
  percent: number;
}

export interface MonthlySummary {
  income: number;
  expenses: number;
  net: number;
}
