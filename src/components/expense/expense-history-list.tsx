"use client";

import { Loader2, Receipt } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CategoryGroupTable,
  ExpenseHistoryTable,
} from "@/components/expense/expense-history-table";
import { MonthSelector } from "@/components/expense/month-selector";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { groupByCategory } from "@/lib/expense-analytics";
import { formatAmount, formatYearMonthLabel, getCurrentYearMonth } from "@/lib/format";
import { getExpenses, getMonthlyTotal } from "@/lib/expenses";
import type { ExpenseDocument } from "@/types/expense";

type ViewMode = "category" | "date";

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: "category", label: "項目別" },
  { id: "date", label: "日付順" },
];

export function ExpenseHistoryList() {
  const { savedVersion } = useExpenseInput();
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [viewMode, setViewMode] = useState<ViewMode>("category");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch {
      setError("履歴の読み込みに失敗しました。");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses, savedVersion]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth],
  );

  const monthTotal = useMemo(
    () => getMonthlyTotal(expenses, selectedMonth),
    [expenses, selectedMonth],
  );

  const categoryGroups = useMemo(
    () => groupByCategory(monthExpenses),
    [monthExpenses],
  );

  const sortedByDate = useMemo(
    () => [...monthExpenses].sort((a, b) => a.date.localeCompare(b.date)),
    [monthExpenses],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden />
        <span className="sr-only">読み込み中</span>
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={loadExpenses}
          className="mt-3 text-sm font-medium text-teal-700 underline"
        >
          再試行
        </button>
      </section>
    );
  }

  if (expenses.length === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10">
        <Receipt className="h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-center text-sm text-slate-500">
          まだ支出がありません
          <br />
          下の「入力」から記録できます
        </p>
      </section>
    );
  }

  const monthLabel = formatYearMonthLabel(selectedMonth);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">{monthLabel}の合計</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
          {formatAmount(monthTotal)}
        </p>
        <p className="mt-1 text-xs text-slate-400">{monthExpenses.length} 件</p>
      </section>

      {monthExpenses.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <p className="text-sm text-slate-500">{monthLabel}の支出はありません</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 pb-3 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">明細</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {viewMode === "category"
                ? "項目ごとにまとめて表示 · 行をタップして編集"
                : "日付の古い順 · 行をタップして編集"}
            </p>
          </div>

          <div className="flex gap-1 p-2">
            {VIEW_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
                  viewMode === id
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-2 pb-3 pt-1">
            {viewMode === "category" ? (
              <div className="flex flex-col gap-3">
                {categoryGroups.map((group) => (
                  <CategoryGroupTable
                    key={group.category}
                    category={group.category}
                    total={group.total}
                    count={group.count}
                    expenses={group.expenses}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <ExpenseHistoryTable rows={sortedByDate} showCategory />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
