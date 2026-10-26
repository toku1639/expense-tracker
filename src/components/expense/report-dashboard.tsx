"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ItemPriceInsights } from "@/components/expense/item-price-insights";
import { useExpenseInput } from "@/contexts/expense-input-context";
import {
  aggregateByCategory,
  comparePeriods,
} from "@/lib/expense-analytics";
import { getCategoryVisual } from "@/lib/category-icons";
import {
  formatAmount,
  formatMonthRangeLabel,
  formatYearMonthLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from "@/lib/format";
import { getExpenses } from "@/lib/expenses";
import {
  isExpenseTransaction,
  type ExpenseDocument,
} from "@/types/expense";

type PeriodMode = "month" | "year";
type SideTab = "expense" | "income";

const PIE_FALLBACK = ["#0d9488", "#2563eb", "#d97706", "#db2777", "#7c3aed", "#64748b"];

export function ReportDashboard() {
  const { savedVersion } = useExpenseInput();
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [sideTab, setSideTab] = useState<SideTab>("expense");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await getExpenses());
    } catch {
      setError("レポートの読み込みに失敗しました。");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, savedVersion]);

  const year = yearMonth.slice(0, 4);

  const inPeriod = useCallback(
    (row: ExpenseDocument) => {
      if (periodMode === "month") return row.date.startsWith(yearMonth);
      return row.date.startsWith(year);
    },
    [periodMode, yearMonth, year],
  );

  const expenseTotal = useMemo(
    () =>
      expenses
        .filter((e) => inPeriod(e) && isExpenseTransaction(e))
        .reduce((s, e) => s + e.amount, 0),
    [expenses, inPeriod],
  );

  const incomeTotal = useMemo(
    () =>
      expenses
        .filter((e) => inPeriod(e) && e.type === "income")
        .reduce((s, e) => s + e.amount, 0),
    [expenses, inPeriod],
  );

  const balance = incomeTotal - expenseTotal;

  const categoryRows = useMemo(() => {
    if (periodMode === "month") {
      return sideTab === "expense"
        ? aggregateByCategory(expenses, yearMonth)
        : aggregateIncomeByCategory(expenses, yearMonth);
    }

    const map = new Map<string, number>();
    for (const row of expenses) {
      if (!row.date.startsWith(year)) continue;
      const isExpense = isExpenseTransaction(row);
      if (sideTab === "expense" ? !isExpense : isExpense) continue;
      const cat = row.category || "その他";
      map.set(cat, (map.get(cat) ?? 0) + row.amount);
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, periodMode, sideTab, yearMonth, year]);

  const mom = useMemo(
    () => comparePeriods(expenses, yearMonth, shiftYearMonth(yearMonth, -1)),
    [expenses, yearMonth],
  );

  const pieData = categoryRows.map((row, i) => ({
    name: row.category,
    value: row.amount,
    color:
      getCategoryVisual(
        row.category,
        sideTab === "income" ? "income" : "expense",
      ).color || PIE_FALLBACK[i % PIE_FALLBACK.length],
  }));

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button type="button" onClick={load} className="mt-3 text-sm text-teal-700 underline">
          再試行
        </button>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="mx-auto flex w-full max-w-xs overflow-hidden rounded-full border border-slate-200">
        {(
          [
            ["month", "月間レポート"],
            ["year", "年間レポート"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriodMode(value)}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              periodMode === value
                ? "bg-slate-100 text-teal-700"
                : "bg-white text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setYearMonth((ym) =>
              shiftYearMonth(ym, periodMode === "month" ? -1 : -12),
            )
          }
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="前へ"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 rounded-xl bg-teal-50 px-3 py-2 text-center">
          <p className="text-base font-bold text-slate-900">
            {periodMode === "month"
              ? formatYearMonthLabel(yearMonth)
              : `${year}年`}
          </p>
          {periodMode === "month" && (
            <p className="text-[11px] text-slate-500">
              {formatMonthRangeLabel(yearMonth)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            setYearMonth((ym) =>
              shiftYearMonth(ym, periodMode === "month" ? 1 : 12),
            )
          }
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="次へ"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 px-3 py-3">
          <p className="text-xs text-slate-500">支出</p>
          <p className="mt-1 text-right text-lg font-bold tabular-nums text-rose-500">
            -{formatAmount(expenseTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 px-3 py-3">
          <p className="text-xs text-slate-500">収入</p>
          <p className="mt-1 text-right text-lg font-bold tabular-nums text-sky-600">
            +{formatAmount(incomeTotal)}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 px-3 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">収支</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                balance >= 0 ? "text-sky-600" : "text-rose-500"
              }`}
            >
              {balance >= 0 ? "+" : ""}
              {formatAmount(balance)}
            </p>
          </div>
          {periodMode === "month" && (
            <p className="mt-1 text-[11px] text-slate-400">
              支出の前月比 {mom.diff >= 0 ? "+" : ""}
              {formatAmount(mom.diff)}
              {mom.changePercent != null ? `（${mom.changePercent}%）` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        {(
          [
            ["expense", "支出"],
            ["income", "収入"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSideTab(value)}
            className={`flex-1 py-2.5 text-sm font-semibold ${
              sideTab === value
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">カテゴリー内訳</h2>
        {pieData.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-400">
            この期間のデータがありません
          </p>
        ) : (
          <>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatAmount(Number(value ?? 0))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 divide-y divide-slate-100">
              {categoryRows.map((row) => (
                <li
                  key={row.category}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-700">{row.category}</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatAmount(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {periodMode === "month" && sideTab === "expense" && (
        <ItemPriceInsights expenses={expenses} />
      )}
    </div>
  );
}

function aggregateIncomeByCategory(
  expenses: ExpenseDocument[],
  yearMonth: string,
) {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.type !== "income") continue;
    if (!expense.date.startsWith(yearMonth)) continue;
    const cat = expense.category || "その他";
    totals.set(cat, (totals.get(cat) ?? 0) + expense.amount);
  }
  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
