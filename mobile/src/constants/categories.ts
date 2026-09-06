import type { Category } from '../types';

interface SeedCategory {
  name: string;
  kind: 'expense' | 'income';
  icon: string;
  color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: SeedCategory[] = [
  { name: 'Food & Dining', kind: 'expense', icon: 'fast-food', color: '#FF7043' },
  { name: 'Transport', kind: 'expense', icon: 'car', color: '#42A5F5' },
  { name: 'Shopping', kind: 'expense', icon: 'cart', color: '#AB47BC' },
  { name: 'Bills & Utilities', kind: 'expense', icon: 'receipt', color: '#26A69A' },
  { name: 'Entertainment', kind: 'expense', icon: 'film', color: '#FFCA28' },
  { name: 'Health', kind: 'expense', icon: 'medkit', color: '#EC407A' },
  { name: 'Education', kind: 'expense', icon: 'school', color: '#5C6BC0' },
  { name: 'Travel', kind: 'expense', icon: 'airplane', color: '#29B6F6' },
  { name: 'Personal', kind: 'expense', icon: 'person', color: '#8D6E63' },
  { name: 'Other', kind: 'expense', icon: 'ellipsis-horizontal', color: '#78909C' },
];

export const DEFAULT_INCOME_CATEGORIES: SeedCategory[] = [
  { name: 'Salary', kind: 'income', icon: 'cash', color: '#66BB6A' },
  { name: 'Freelance', kind: 'income', icon: 'laptop', color: '#26C6DA' },
  { name: 'Business', kind: 'income', icon: 'briefcase', color: '#7E57C2' },
  { name: 'Gift', kind: 'income', icon: 'gift', color: '#EF5350' },
  { name: 'Interest', kind: 'income', icon: 'trending-up', color: '#9CCC65' },
  { name: 'Refund', kind: 'income', icon: 'return-down-back', color: '#FFA726' },
  { name: 'Other', kind: 'income', icon: 'ellipsis-horizontal', color: '#78909C' },
];

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

export function findCategory(categories: Category[], id: string | null): Category | undefined {
  if (!id) return undefined;
  return categories.find((c) => c.id === id);
}
