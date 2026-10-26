"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryIconBadge } from "@/lib/category-icons";
import { getBudgetsForMonth, setCategoryBudget } from "@/lib/budgets";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { aggregateByCategory } from "@/lib/expense-analytics";
import {
  formatAmount,
  formatMonthRangeLabel,
  formatYearMonthLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from "@/lib/format";
import { getExpenses } from "@/lib/expenses";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import type { ExpenseDocument } from "@/types/expense";

export function BudgetDashboard() {
  const { savedVersion } = useExpenseInput();
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [budgetMap, setBudgetMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, budgets] = await Promise.all([
        getExpenses(),
        getBudgetsForMonth(yearMonth),
      ]);
      setExpenses(rows);
      const map: Record<string, number> = {};
      for (const b of budgets) map[b.category] = b.amount;
      setBudgetMap(map);
    } catch {
      setError("予算の読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    load();
  }, [load, savedVersion]);

  const spentByCategory = useMemo(() => {
    const rows = aggregateByCategory(expenses, yearMonth);
    const map: Record<string, number> = {};
    for (const row of rows) map[row.category] = row.amount;
    return map;
  }, [expenses, yearMonth]);

  const budgetTotal = useMemo(
    () =>
      EXPENSE_CATEGORIES.reduce((sum, cat) => sum + (budgetMap[cat] ?? 0), 0),
    [budgetMap],
  );

  const spentOnBudgeted = useMemo(
    () =>
      EXPENSE_CATEGORIES.reduce((sum, cat) => {
        if (!(budgetMap[cat] > 0)) return sum;
        return sum + (spentByCategory[cat] ?? 0);
      }, 0),
    [budgetMap, spentByCategory],
  );

  const saveBudget = async (category: string) => {
    const amount = Number(editText.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      setError("予算額を正しく入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setCategoryBudget(yearMonth, category, amount);
      setBudgetMap((prev) => ({ ...prev, [category]: amount }));
      setEditingCategory(null);
    } catch {
      setError(
        "予算の保存に失敗しました。Firestore ルールに budgets を追加してください。",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const overallRatio =
    budgetTotal > 0 ? Math.min(100, (spentOnBudgeted / budgetTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setYearMonth((ym) => shiftYearMonth(ym, -1))}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="前月"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 rounded-xl bg-teal-50 px-3 py-2 text-center">
          <p className="text-base font-bold text-slate-900">
            {formatYearMonthLabel(yearMonth)}
          </p>
          <p className="text-[11px] text-slate-500">
            {formatMonthRangeLabel(yearMonth)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setYearMonth((ym) => shiftYearMonth(ym, 1))}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="翌月"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">予算合計</p>
          <p className="text-sm font-medium text-slate-600">
            {budgetTotal > 0 ? formatAmount(budgetTotal) : "未設定"}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-600 transition-all"
            style={{ width: `${overallRatio}%` }}
          />
        </div>
        {budgetTotal > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            使用 {formatAmount(spentOnBudgeted)} / {formatAmount(budgetTotal)}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {EXPENSE_CATEGORIES.map((category) => {
          const budget = budgetMap[category] ?? 0;
          const spent = spentByCategory[category] ?? 0;
          const ratio = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
          const over = budget > 0 && spent > budget;
          const editing = editingCategory === category;

          return (
            <div
              key={category}
              className="border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => {
                  setEditingCategory(category);
                  setEditText(budget > 0 ? String(budget) : "");
                }}
              >
                <CategoryIconBadge category={category} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {budget > 0 ? formatAmount(budget) : "未設定"}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        over ? "bg-rose-500" : "bg-teal-600"
                      }`}
                      style={{ width: `${budget > 0 ? ratio : 0}%` }}
                    />
                  </div>
                  {budget > 0 && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      支出 {formatAmount(spent)}
                      {over ? " · 超過" : ""}
                    </p>
                  )}
                </div>
              </button>

              {editing && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editText}
                    onChange={(e) =>
                      setEditText(e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="予算額"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveBudget(category)}
                    className="rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="rounded-full px-3 py-2 text-xs text-slate-500"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
