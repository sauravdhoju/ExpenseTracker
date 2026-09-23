import { Alert } from 'react-native';
import { create } from 'zustand';
import { initDatabase } from '../database/db';
import * as accountRepo from '../database/accountRepo';
import * as categoryRepo from '../database/categoryRepo';
import * as transactionRepo from '../database/transactionRepo';
import * as budgetRepo from '../database/budgetRepo';
import * as recurringRepo from '../database/recurringRepo';
import * as billRepo from '../database/billRepo';
import * as goalRepo from '../database/goalRepo';
import * as settingsRepo from '../database/settingsRepo';
import * as shortcutRepo from '../database/shortcutRepo';
import * as loanRepo from '../database/loanRepo';
import * as loanRepaymentRepo from '../database/loanRepaymentRepo';
import * as forgottenRepo from '../database/forgottenRepo';
import * as dailyTrackingRepo from '../database/dailyTrackingRepo';
import { processDueRecurringTransactions } from '../services/recurringService';
import { getBudgetUsage, getCurrentStreak, STREAK_MILESTONES, trackedDatesSet } from '../services/calculations';
import { sendBudgetWarning, scheduleLoanReminder, cancelLoanReminder } from '../services/notificationService';
import { addDays, monthKey, todayISO } from '../utils/date';
import type {
  Account,
  AppSettings,
  Bill,
  Budget,
  Category,
  DailyTracking,
  ForgottenEntry,
  Goal,
  Loan,
  LoanRepayment,
  RecurringTransaction,
  Shortcut,
  Transaction,
} from '../types';

/** Fire-and-forget: marks today tracked without its own refreshAll (the caller already does one). */
async function autoMarkToday(): Promise<void> {
  await dailyTrackingRepo.markTracked(todayISO());
}

interface AppState {
  isReady: boolean;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  bills: Bill[];
  goals: Goal[];
  shortcuts: Shortcut[];
  loans: Loan[];
  repayments: LoanRepayment[];
  forgottenEntries: ForgottenEntry[];
  dailyTracking: DailyTracking[];
  settings: AppSettings;

  bootstrap: () => Promise<void>;
  refreshAll: () => Promise<void>;

  addAccount: (input: accountRepo.CreateAccountInput) => Promise<Account>;
  updateAccount: (id: string, input: Parameters<typeof accountRepo.updateAccount>[1]) => Promise<void>;
  archiveAccount: (id: string, isActive: boolean) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;

  addCategory: (input: categoryRepo.CreateCategoryInput) => Promise<Category>;
  setCategoryEnabled: (id: string, enabled: boolean) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  addTransaction: (input: transactionRepo.CreateTransactionInput) => Promise<Transaction>;
  editTransaction: (id: string, input: transactionRepo.CreateTransactionInput) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  upsertBudget: (input: budgetRepo.CreateBudgetInput) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;

  addRecurring: (input: recurringRepo.CreateRecurringInput) => Promise<void>;
  runRecurringCheck: () => Promise<void>;
  setRecurringActive: (id: string, active: boolean) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;

  addBill: (input: billRepo.CreateBillInput) => Promise<void>;
  setBillPaid: (id: string, paid: boolean) => Promise<void>;
  removeBill: (id: string) => Promise<void>;

  addGoal: (input: goalRepo.CreateGoalInput) => Promise<void>;
  contributeToGoal: (id: string, amount: number) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;

  addShortcut: (input: shortcutRepo.CreateShortcutInput) => Promise<Shortcut>;
  editShortcut: (id: string, input: shortcutRepo.CreateShortcutInput) => Promise<void>;
  removeShortcut: (id: string) => Promise<void>;
  reorderShortcuts: (orderedIds: string[]) => Promise<void>;

  addLoan: (input: loanRepo.CreateLoanInput) => Promise<Loan>;
  editLoan: (id: string, input: loanRepo.CreateLoanInput) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  addRepayment: (input: loanRepaymentRepo.CreateRepaymentInput) => Promise<void>;
  removeRepayment: (id: string) => Promise<void>;

  addForgottenEntry: (input: forgottenRepo.CreateForgottenEntryInput) => Promise<ForgottenEntry>;
  addForgottenResolution: (
    entryId: string,
    input: { amount: number; categoryId: string; title: string; date: string; note?: string | null }
  ) => Promise<void>;
  removeForgottenEntry: (id: string) => Promise<void>;

  markTodayTracked: () => Promise<void>;
  applyGraceDay: () => Promise<void>;

  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

let bootstrapPromise: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  recurring: [],
  bills: [],
  goals: [],
  shortcuts: [],
  loans: [],
  repayments: [],
  forgottenEntries: [],
  dailyTracking: [],
  settings: settingsRepo.DEFAULT_SETTINGS,

  bootstrap: async () => {
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      await initDatabase();
      await categoryRepo.seedDefaultCategories();
      await processDueRecurringTransactions();
      await get().refreshAll();
      set({ isReady: true });
      import('../services/cloudBackupService').then((m) => m.maybeRunAutoBackup().catch(() => {}));
    })();
    return bootstrapPromise;
  },

  refreshAll: async () => {
    const [
      accounts,
      categories,
      transactions,
      budgets,
      recurring,
      bills,
      goals,
      shortcuts,
      loans,
      repayments,
      forgottenEntries,
      dailyTracking,
      settings,
    ] = await Promise.all([
      accountRepo.getAllAccounts(),
      categoryRepo.getAllCategories(),
      transactionRepo.getAllTransactions(),
      budgetRepo.getAllBudgets(),
      recurringRepo.getAllRecurring(),
      billRepo.getAllBills(),
      goalRepo.getAllGoals(),
      shortcutRepo.getAllShortcuts(),
      loanRepo.getAllLoans(),
      loanRepaymentRepo.getAllRepayments(),
      forgottenRepo.getAllForgottenEntries(),
      dailyTrackingRepo.getAllTracking(),
      settingsRepo.getAllSettings(),
    ]);
    set({
      accounts,
      categories,
      transactions,
      budgets,
      recurring,
      bills,
      goals,
      shortcuts,
      loans,
      repayments,
      forgottenEntries,
      dailyTracking,
      settings,
    });
  },

  addAccount: async (input) => {
    const account = await accountRepo.createAccount(input);
    await get().refreshAll();
    return account;
  },
  updateAccount: async (id, input) => {
    await accountRepo.updateAccount(id, input);
    await get().refreshAll();
  },
  archiveAccount: async (id, isActive) => {
    await accountRepo.setAccountActive(id, isActive);
    await get().refreshAll();
  },
  removeAccount: async (id) => {
    await accountRepo.deleteAccount(id);
    await get().refreshAll();
  },

  addCategory: async (input) => {
    const category = await categoryRepo.createCategory(input);
    await get().refreshAll();
    return category;
  },
  setCategoryEnabled: async (id, enabled) => {
    await categoryRepo.setCategoryEnabled(id, enabled);
    await get().refreshAll();
  },
  removeCategory: async (id) => {
    await categoryRepo.deleteCategory(id);
    await get().refreshAll();
  },

  addTransaction: async (input) => {
    const { settings, budgets, transactions, categories } = get();
    let before: { spent: number } | null = null;
    const budget =
      input.type === 'expense'
        ? budgets.find((b) => b.categoryId === input.categoryId) ?? budgets.find((b) => b.categoryId === null)
        : null;
    if (budget && settings.budgetAlertEnabled) {
      before = { spent: getBudgetUsage(budget, transactions).spent };
    }

    const transaction = await transactionRepo.createTransaction(input);
    await autoMarkToday();
    await get().refreshAll();

    if (budget && before && settings.budgetAlertEnabled) {
      const after = getBudgetUsage(budget, get().transactions);
      const beforePercent = budget.amount > 0 ? (before.spent / budget.amount) * 100 : 0;
      if (beforePercent < settings.budgetAlertThreshold && after.percentUsed >= settings.budgetAlertThreshold) {
        const categoryName = budget.categoryId
          ? categories.find((c) => c.id === budget.categoryId)?.name ?? 'Overall'
          : 'Overall';
        sendBudgetWarning(categoryName, after.percentUsed).catch(() => {});
      }
    }

    return transaction;
  },
  editTransaction: async (id, input) => {
    await transactionRepo.updateTransaction(id, input);
    await autoMarkToday();
    await get().refreshAll();
  },
  removeTransaction: async (id) => {
    await transactionRepo.deleteTransaction(id);
    await get().refreshAll();
  },

  upsertBudget: async (input) => {
    await budgetRepo.upsertBudget(input);
    await get().refreshAll();
  },
  removeBudget: async (id) => {
    await budgetRepo.deleteBudget(id);
    await get().refreshAll();
  },

  addRecurring: async (input) => {
    await recurringRepo.createRecurring(input);
    await processDueRecurringTransactions();
    await get().refreshAll();
  },
  runRecurringCheck: async () => {
    await processDueRecurringTransactions();
    await get().refreshAll();
  },
  setRecurringActive: async (id, active) => {
    await recurringRepo.setRecurringActive(id, active);
    await get().refreshAll();
  },
  removeRecurring: async (id) => {
    await recurringRepo.deleteRecurring(id);
    await get().refreshAll();
  },

  addBill: async (input) => {
    await billRepo.createBill(input);
    await get().refreshAll();
  },
  setBillPaid: async (id, paid) => {
    await billRepo.setBillPaid(id, paid);
    await get().refreshAll();
  },
  removeBill: async (id) => {
    await billRepo.deleteBill(id);
    await get().refreshAll();
  },

  addGoal: async (input) => {
    await goalRepo.createGoal(input);
    await get().refreshAll();
  },
  contributeToGoal: async (id, amount) => {
    await goalRepo.contributeToGoal(id, amount);
    await get().refreshAll();
  },
  removeGoal: async (id) => {
    await goalRepo.deleteGoal(id);
    await get().refreshAll();
  },

  addShortcut: async (input) => {
    const shortcut = await shortcutRepo.createShortcut(input);
    await get().refreshAll();
    return shortcut;
  },
  editShortcut: async (id, input) => {
    await shortcutRepo.updateShortcut(id, input);
    await get().refreshAll();
  },
  removeShortcut: async (id) => {
    await shortcutRepo.deleteShortcut(id);
    await get().refreshAll();
  },
  reorderShortcuts: async (orderedIds) => {
    await shortcutRepo.reorderShortcuts(orderedIds);
    await get().refreshAll();
  },

  addLoan: async (input) => {
    const loan = await loanRepo.createLoan(input);
    // The linked transaction reuses the loan's own id, so lookups/deletes never need a search.
    await transactionRepo.createTransaction({
      id: loan.id,
      type: 'lent',
      amount: loan.originalAmount,
      accountId: loan.accountId,
      categoryId: null,
      title: `Lent to ${loan.personName}`,
      date: loan.lentDate,
      loanId: loan.id,
    });
    await autoMarkToday();
    await get().refreshAll();

    const { settings } = get();
    if (settings.lentReminderEnabled && loan.reminderEnabled && loan.expectedReturnDate) {
      scheduleLoanReminder(
        loan.id,
        loan.personName,
        String(loan.originalAmount),
        new Date(loan.expectedReturnDate + 'T00:00:00')
      ).catch(() => {});
    }
    return loan;
  },
  editLoan: async (id, input) => {
    await loanRepo.updateLoan(id, input);
    await transactionRepo.updateTransaction(id, {
      type: 'lent',
      amount: input.originalAmount,
      accountId: input.accountId,
      categoryId: null,
      title: `Lent to ${input.personName}`,
      date: input.lentDate,
      loanId: id,
    });
    await get().refreshAll();

    const { settings } = get();
    if (settings.lentReminderEnabled && (input.reminderEnabled ?? true) && input.expectedReturnDate) {
      scheduleLoanReminder(
        id,
        input.personName,
        String(input.originalAmount),
        new Date(input.expectedReturnDate + 'T00:00:00')
      ).catch(() => {});
    } else {
      cancelLoanReminder(id).catch(() => {});
    }
  },
  removeLoan: async (id) => {
    const linkedRepaymentIds = get().repayments.filter((r) => r.loanId === id).map((r) => r.id);
    for (const repaymentId of linkedRepaymentIds) {
      await transactionRepo.deleteTransaction(repaymentId);
      await loanRepaymentRepo.deleteRepayment(repaymentId);
    }
    await transactionRepo.deleteTransaction(id);
    await loanRepo.deleteLoan(id);
    cancelLoanReminder(id).catch(() => {});
    await get().refreshAll();
  },
  addRepayment: async (input) => {
    const loan = get().loans.find((l) => l.id === input.loanId);
    const repayment = await loanRepaymentRepo.createRepayment(input);
    // The linked transaction reuses the repayment's own id, so lookups/deletes never need a search.
    await transactionRepo.createTransaction({
      id: repayment.id,
      type: 'repayment',
      amount: input.amount,
      accountId: input.accountId,
      categoryId: null,
      title: loan ? `Repayment from ${loan.personName}` : 'Loan repayment',
      date: input.date,
      notes: input.note,
      loanId: input.loanId,
    });
    await autoMarkToday();
    await get().refreshAll();
  },
  removeRepayment: async (id) => {
    await transactionRepo.deleteTransaction(id);
    await loanRepaymentRepo.deleteRepayment(id);
    await get().refreshAll();
  },

  addForgottenEntry: async (input) => {
    const entry = await forgottenRepo.createForgottenEntry(input);
    // The linked transaction reuses the entry's own id, so lookups/deletes never need a search.
    await transactionRepo.createTransaction({
      id: entry.id,
      type: 'forgotten',
      amount: entry.amount,
      accountId: entry.accountId,
      categoryId: null,
      title: 'Forgotten Money',
      date: entry.date,
      forgottenId: entry.id,
    });
    await autoMarkToday();
    await get().refreshAll();
    return entry;
  },
  addForgottenResolution: async (entryId, input) => {
    const category = get().categories.find((c) => c.id === input.categoryId);
    await transactionRepo.createTransaction({
      type: 'expense',
      amount: input.amount,
      accountId: get().forgottenEntries.find((e) => e.id === entryId)?.accountId ?? get().accounts[0]?.id ?? '',
      categoryId: input.categoryId,
      title: input.title || category?.name || 'Resolved expense',
      date: input.date,
      notes: input.note ?? null,
      forgottenId: entryId,
      affectsBalance: false,
    });
    await autoMarkToday();
    await get().refreshAll();
  },
  removeForgottenEntry: async (id) => {
    const linkedTransactionIds = get()
      .transactions.filter((t) => t.forgottenId === id)
      .map((t) => t.id);
    for (const txId of linkedTransactionIds) {
      await transactionRepo.deleteTransaction(txId);
    }
    await forgottenRepo.deleteForgottenEntry(id);
    await get().refreshAll();
  },

  markTodayTracked: async () => {
    const before = getCurrentStreak(trackedDatesSet(get().dailyTracking));
    await dailyTrackingRepo.markTracked(todayISO());
    await get().refreshAll();
    const after = getCurrentStreak(trackedDatesSet(get().dailyTracking));
    if (after > before && STREAK_MILESTONES.includes(after)) {
      Alert.alert(`🎉 ${after} Day Streak!`, `You've consistently tracked your finances for ${after} days.`);
    }
  },
  applyGraceDay: async () => {
    const { settings, dailyTracking } = get();
    if (!settings.graceDayEnabled) return;
    const yesterday = addDays(todayISO(), -1);
    if (trackedDatesSet(dailyTracking).has(yesterday)) return;
    const alreadyUsed = await dailyTrackingRepo.hasGraceDayInMonth(monthKey(new Date()));
    if (alreadyUsed) return;
    await dailyTrackingRepo.useGraceDay(yesterday);
    await get().refreshAll();
  },

  updateSettings: async (partial) => {
    for (const [key, value] of Object.entries(partial)) {
      await settingsRepo.setSetting(key as keyof AppSettings, value as never);
    }
    set({ settings: { ...get().settings, ...partial } });
  },
}));
