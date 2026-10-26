import type { BudgetDocument } from "@/lib/budgets";
import { aggregateByCategory } from "@/lib/expense-analytics";
import { EXPENSE_CATEGORIES, type ExpenseDocument } from "@/types/expense";

export type BudgetOverview = {
  budgetTotal: number;
  spentOnBudgeted: number;
  remaining: number;
  hasBudget: boolean;
  overBudget: boolean;
};

/** 設定済み予算カテゴリに対する今月の残り金額 */
export function getBudgetOverview(
  expenses: ExpenseDocument[],
  budgets: BudgetDocument[],
  yearMonth: string,
): BudgetOverview {
  const budgetMap = new Map(
    budgets.filter((b) => b.amount > 0).map((b) => [b.category, b.amount]),
  );

  const spentRows = aggregateByCategory(expenses, yearMonth);
  const spentMap = new Map(spentRows.map((r) => [r.category, r.amount]));

  let budgetTotal = 0;
  let spentOnBudgeted = 0;

  for (const cat of EXPENSE_CATEGORIES) {
    const budget = budgetMap.get(cat) ?? 0;
    if (budget <= 0) continue;
    budgetTotal += budget;
    spentOnBudgeted += spentMap.get(cat) ?? 0;
  }

  // カスタム/旧カテゴリで予算だけある場合も拾う
  for (const [cat, budget] of budgetMap) {
    if ((EXPENSE_CATEGORIES as readonly string[]).includes(cat)) continue;
    budgetTotal += budget;
    spentOnBudgeted += spentMap.get(cat) ?? 0;
  }

  const remaining = budgetTotal - spentOnBudgeted;

  return {
    budgetTotal,
    spentOnBudgeted,
    remaining,
    hasBudget: budgetTotal > 0,
    overBudget: remaining < 0,
  };
}
