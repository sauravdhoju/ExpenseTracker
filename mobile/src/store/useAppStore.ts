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
import { processDueRecurringTransactions } from '../services/recurringService';
import type {
  Account,
  AppSettings,
  Bill,
  Budget,
  Category,
  Goal,
  RecurringTransaction,
  Transaction,
} from '../types';

interface AppState {
  isReady: boolean;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  bills: Bill[];
  goals: Goal[];
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
    const [accounts, categories, transactions, budgets, recurring, bills, goals, settings] =
      await Promise.all([
        accountRepo.getAllAccounts(),
        categoryRepo.getAllCategories(),
        transactionRepo.getAllTransactions(),
        budgetRepo.getAllBudgets(),
        recurringRepo.getAllRecurring(),
        billRepo.getAllBills(),
        goalRepo.getAllGoals(),
        settingsRepo.getAllSettings(),
      ]);
    set({ accounts, categories, transactions, budgets, recurring, bills, goals, settings });
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
    const transaction = await transactionRepo.createTransaction(input);
    await get().refreshAll();
    return transaction;
  },
  editTransaction: async (id, input) => {
    await transactionRepo.updateTransaction(id, input);
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

  updateSettings: async (partial) => {
    for (const [key, value] of Object.entries(partial)) {
      await settingsRepo.setSetting(key as keyof AppSettings, value as never);
    }
    set({ settings: { ...get().settings, ...partial } });
  },
}));
