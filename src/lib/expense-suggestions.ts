import { getExpenses } from "@/lib/expenses";
import type { ExpenseDocument } from "@/types/expense";

export type ExpenseSuggestion = {
  itemName: string;
  amount: number;
  category: string;
};

/** 過去の支出から品名ごとにユニークなサジェスト一覧を構築（新しい順を優先） */
export function buildExpenseSuggestions(
  expenses: ExpenseDocument[],
): ExpenseSuggestion[] {
  const map = new Map<string, ExpenseSuggestion>();

  for (const expense of expenses) {
    const name = expense.itemName.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (map.has(key)) continue;

    map.set(key, {
      itemName: name,
      amount: expense.amount,
      category: expense.category,
    });
  }

  return Array.from(map.values());
}

/** 品名の入力文字列でサジェストをフィルタ */
export function filterExpenseSuggestions(
  suggestions: ExpenseSuggestion[],
  query: string,
  max = 8,
): ExpenseSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return suggestions
    .filter((s) => s.itemName.toLowerCase().includes(q))
    .slice(0, max);
}

/** Firestore からサジェスト用データを取得 */
export async function fetchExpenseSuggestions(): Promise<ExpenseSuggestion[]> {
  const expenses = await getExpenses({ max: 200 });
  return buildExpenseSuggestions(expenses);
}
