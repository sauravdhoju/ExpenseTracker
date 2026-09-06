import type { Budget, Category, Transaction } from '../types';
import { getBudgetUsage, getCategorySpending, getMonthlyComparison } from './calculations';

export interface Insight {
  id: string;
  text: string;
}

/**
 * Generates a small set of insights strictly from real stored data.
 * Never fabricates numbers - every sentence is backed by an actual calculation.
 */
export function generateInsights(
  currentMonthTx: Transaction[],
  previousMonthTx: Transaction[],
  categories: Category[],
  budgets: Budget[]
): Insight[] {
  const insights: Insight[] = [];
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Unknown';

  const currentSpending = getCategorySpending(currentMonthTx);
  const previousSpending = getCategorySpending(previousMonthTx);

  if (currentSpending.length > 0) {
    const top = currentSpending[0];
    insights.push({
      id: 'top-category',
      text: `${categoryName(top.categoryId)} is your highest expense category this month at ${top.percent.toFixed(0)}% of total spending.`,
    });
  }

  if (currentSpending.length > 1) {
    const second = currentSpending[1];
    insights.push({
      id: 'second-category',
      text: `${categoryName(second.categoryId)} is your second-highest expense this month.`,
    });
  }

  for (const current of currentSpending) {
    const previous = previousSpending.find((p) => p.categoryId === current.categoryId);
    if (!previous || previous.amount === 0) continue;
    const comparison = getMonthlyComparison(current.amount, previous.amount);
    if (Math.abs(comparison.percentChange) >= 15) {
      const direction = comparison.percentChange > 0 ? 'more' : 'less';
      insights.push({
        id: `trend-${current.categoryId}`,
        text: `You spent ${Math.abs(comparison.percentChange).toFixed(0)}% ${direction} on ${categoryName(current.categoryId)} than last month.`,
      });
    }
  }

  for (const budget of budgets) {
    if (!budget.categoryId) continue;
    const usage = getBudgetUsage(budget, currentMonthTx);
    if (usage.percentUsed >= 90 && usage.percentUsed < 100) {
      insights.push({
        id: `budget-warn-${budget.id}`,
        text: `You've used ${usage.percentUsed.toFixed(0)}% of your ${categoryName(budget.categoryId!)} budget.`,
      });
    } else if (usage.isExceeded) {
      insights.push({
        id: `budget-exceed-${budget.id}`,
        text: `You've exceeded your ${categoryName(budget.categoryId!)} budget by ${(usage.spent - budget.amount).toFixed(0)}.`,
      });
    }
  }

  return insights.slice(0, 3);
}
