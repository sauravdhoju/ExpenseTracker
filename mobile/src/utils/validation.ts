import { z } from 'zod';

export const amountSchema = z
  .string()
  .min(1, 'Amount is required')
  .refine((v) => !Number.isNaN(parseFloat(v)), 'Enter a valid number')
  .refine((v) => parseFloat(v) > 0, 'Amount must be greater than 0');

export const expenseIncomeSchema = z.object({
  amount: amountSchema,
  categoryId: z.string().min(1, 'Select a category'),
  accountId: z.string().min(1, 'Select an account'),
  title: z.string().min(1, 'Enter a title'),
  notes: z.string().optional(),
  date: z.string().min(1),
});

export const transferSchema = z
  .object({
    amount: amountSchema,
    fromAccountId: z.string().min(1, 'Select a source account'),
    toAccountId: z.string().min(1, 'Select a destination account'),
    notes: z.string().optional(),
    date: z.string().min(1),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: 'Source and destination accounts must be different',
    path: ['toAccountId'],
  });

export const accountSchema = z.object({
  name: z.string().min(1, 'Enter an account name'),
  initialBalance: z
    .string()
    .refine((v) => v === '' || !Number.isNaN(parseFloat(v)), 'Enter a valid number'),
});

export const budgetSchema = z.object({
  amount: amountSchema,
});

export const goalSchema = z.object({
  name: z.string().min(1, 'Enter a goal name'),
  targetAmount: amountSchema,
  currentAmount: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(parseFloat(v)), 'Enter a valid number'),
});

export const recurringSchema = z.object({
  title: z.string().min(1, 'Enter a title'),
  amount: amountSchema,
  categoryId: z.string().min(1, 'Select a category'),
  accountId: z.string().min(1, 'Select an account'),
});

export const billSchema = z.object({
  title: z.string().min(1, 'Enter a title'),
  amount: amountSchema,
  dueDate: z.string().min(1),
});
