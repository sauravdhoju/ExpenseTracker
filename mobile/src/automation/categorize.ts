/**
 * Built-in keyword -> category rules. Returns a default category *name* (see constants/categories.ts),
 * which the caller resolves to the user's category id. User-learned merchant rules take priority
 * over these and are looked up separately (automationRepo.getMerchantRule).
 */
import type { CategoryKind } from '../types';

interface CategoryRule {
  re: RegExp;
  category: string;
  kind: CategoryKind;
}

const RULES: CategoryRule[] = [
  { re: /food ?mandu|pathao food|\bkfc\b|restaurant|\bcafe\b|coffee|bakery|\bmomo\b|pizza|burger|\bfoods?\b/i, category: 'Food & Dining', kind: 'expense' },
  { re: /bhat-?bhateni|big ?mart|sales ?berry|\bdaraz\b|supermarket|\bmart\b|grocery|\bstore\b|shopping/i, category: 'Shopping', kind: 'expense' },
  { re: /nepal telecom|\bntc\b|\bncell\b|nepal electricity|\bnea\b|electricity|water supply|khanepani|world ?link|\bvianet\b|dish ?home|internet|top-?up|recharge/i, category: 'Bills & Utilities', kind: 'expense' },
  { re: /\bpathao\b|\bindrive\b|\btootle\b|\bfuel\b|petrol|diesel|nepal oil|\bbus\b|\btaxi\b|parking/i, category: 'Transport', kind: 'expense' },
  { re: /pharmacy|hospital|clinic|medical|\bmedic/i, category: 'Health', kind: 'expense' },
  { re: /\bnetflix\b|\bspotify\b|\bqfx\b|cinema|movie/i, category: 'Entertainment', kind: 'expense' },
  { re: /college|school|tuition|university|\bfees?\b/i, category: 'Education', kind: 'expense' },
  { re: /airlines?|\bhotel\b|\bflight\b/i, category: 'Travel', kind: 'expense' },
  { re: /\bsalary\b|payroll/i, category: 'Salary', kind: 'income' },
  { re: /\binterest\b/i, category: 'Interest', kind: 'income' },
  { re: /refund|cashback|reversed|reversal/i, category: 'Refund', kind: 'income' },
];

export function suggestCategoryName(text: string, kind: CategoryKind): string | null {
  return RULES.find((r) => r.kind === kind && r.re.test(text))?.category ?? null;
}

/** Stable key for a learned merchant rule: lowercase, whitespace-collapsed, punctuation-free. */
export function merchantKey(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
