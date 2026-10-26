import { getExpenses } from "@/lib/expenses";
import {
  getTransactionType,
  type ExpenseDocument,
  type TransactionType,
} from "@/types/expense";

export type ExpenseSuggestion = {
  itemName: string;
  amount: number;
  category: string;
  type: TransactionType;
};

/** 過去の取引から品名ごとにユニークなサジェスト一覧を構築（新しい順を優先） */
export function buildExpenseSuggestions(
  expenses: ExpenseDocument[],
  typeFilter?: TransactionType,
): ExpenseSuggestion[] {
  const map = new Map<string, ExpenseSuggestion>();

  for (const expense of expenses) {
    const type = getTransactionType(expense);
    if (typeFilter && type !== typeFilter) continue;

    const name = expense.itemName.trim();
    if (!name) continue;

    const key = `${type}:${name.toLowerCase()}`;
    if (map.has(key)) continue;

    map.set(key, {
      itemName: name,
      amount: expense.amount,
      category: expense.category,
      type,
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
export async function fetchExpenseSuggestions(
  typeFilter?: TransactionType,
): Promise<ExpenseSuggestion[]> {
  const expenses = await getExpenses({ max: 200 });
  return buildExpenseSuggestions(expenses, typeFilter);
}
