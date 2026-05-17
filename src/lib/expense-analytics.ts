import { formatYearMonthLabel, shiftYearMonth } from "@/lib/format";
import type { ExpenseDocument } from "@/types/expense";

export type DailyChartPoint = {
  day: number;
  label: string;
  amount: number;
};

export type CategoryChartPoint = {
  category: string;
  amount: number;
};

export type MonthlyChartPoint = {
  yearMonth: string;
  label: string;
  amount: number;
};

/** 指定月の日別支出合計（1日〜月末） */
export function aggregateDailyTotals(
  expenses: ExpenseDocument[],
  yearMonth: string,
): DailyChartPoint[] {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return [];

  const daysInMonth = new Date(y, m, 0).getDate();
  const totals = new Map<number, number>();

  for (let d = 1; d <= daysInMonth; d++) {
    totals.set(d, 0);
  }

  for (const expense of expenses) {
    if (!expense.date.startsWith(yearMonth)) continue;
    const day = Number(expense.date.split("-")[2]);
    if (!day) continue;
    totals.set(day, (totals.get(day) ?? 0) + expense.amount);
  }

  return Array.from(totals.entries()).map(([day, amount]) => ({
    day,
    label: `${day}日`,
    amount,
  }));
}

/** 指定月のカテゴリ別支出合計 */
export function aggregateByCategory(
  expenses: ExpenseDocument[],
  yearMonth: string,
): CategoryChartPoint[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (!expense.date.startsWith(yearMonth)) continue;
    const cat = expense.category || "その他";
    totals.set(cat, (totals.get(cat) ?? 0) + expense.amount);
  }

  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** 直近 N か月の月別支出合計 */
export function aggregateMonthlyTotals(
  expenses: ExpenseDocument[],
  monthCount = 12,
): MonthlyChartPoint[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const ym = expense.date.slice(0, 7);
    if (ym.length !== 7) continue;
    totals.set(ym, (totals.get(ym) ?? 0) + expense.amount);
  }

  const result: MonthlyChartPoint[] = [];
  const now = new Date();

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({
      yearMonth,
      label: formatYearMonthLabel(yearMonth),
      amount: totals.get(yearMonth) ?? 0,
    });
  }

  return result;
}

export function hasAnyExpenseInMonth(
  expenses: ExpenseDocument[],
  yearMonth: string,
): boolean {
  return expenses.some((e) => e.date.startsWith(yearMonth) && e.amount > 0);
}

export type MonthSummary = {
  total: number;
  count: number;
  prevMonthTotal: number;
  diffFromPrev: number;
  dailyAverage: number;
  topCategory: { name: string; amount: number } | null;
};

/** 指定月のサマリー（前月比・日平均・トップカテゴリ） */
export function getMonthSummary(
  expenses: ExpenseDocument[],
  yearMonth: string,
): MonthSummary {
  const monthExpenses = expenses.filter((e) => e.date.startsWith(yearMonth));
  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const count = monthExpenses.length;

  const prevMonth = shiftYearMonth(yearMonth, -1);
  const prevMonthTotal = expenses
    .filter((e) => e.date.startsWith(prevMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const [y, m] = yearMonth.split("-").map(Number);
  const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 30;
  const dailyAverage =
    daysInMonth > 0 ? Math.round(total / daysInMonth) : 0;

  const categories = aggregateByCategory(expenses, yearMonth);
  const topCategory = categories[0]
    ? { name: categories[0].category, amount: categories[0].amount }
    : null;

  return {
    total,
    count,
    prevMonthTotal,
    diffFromPrev: total - prevMonthTotal,
    dailyAverage,
    topCategory,
  };
}

export function hasAnyExpenseData(expenses: ExpenseDocument[]): boolean {
  return expenses.some((e) => e.amount > 0);
}

export type CategoryGroup = {
  category: string;
  total: number;
  count: number;
  expenses: ExpenseDocument[];
};

/** カテゴリ別にグループ化（金額の多い順） */
export function groupByCategory(expenses: ExpenseDocument[]): CategoryGroup[] {
  const map = new Map<string, ExpenseDocument[]>();

  for (const expense of expenses) {
    const cat = expense.category || "その他";
    const list = map.get(cat) ?? [];
    list.push(expense);
    map.set(cat, list);
  }

  return Array.from(map.entries())
    .map(([category, items]) => {
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      const total = sorted.reduce((sum, e) => sum + e.amount, 0);
      return { category, total, count: sorted.length, expenses: sorted };
    })
    .sort((a, b) => b.total - a.total);
}
