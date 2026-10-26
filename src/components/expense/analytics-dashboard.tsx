"use client";

import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ItemPriceInsights } from "@/components/expense/item-price-insights";
import { RecurringExpensePanel } from "@/components/expense/recurring-expense-panel";
import { useExpenseInput } from "@/contexts/expense-input-context";
import {
  aggregateCategoryTrends,
  comparePeriods,
  getCategoryPeriodChanges,
  splitFixedAndVariable,
} from "@/lib/expense-analytics";
import {
  formatAmount,
  formatYearMonthLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from "@/lib/format";
import { getExpenses } from "@/lib/expenses";
import { applyDueRecurringExpenses } from "@/lib/recurring-expenses";
import type { ExpenseDocument } from "@/types/expense";

const TREND_COLORS = [
  "#0d9488",
  "#2563eb",
  "#d97706",
  "#db2777",
  "#7c3aed",
];

function DiffBadge({ diff, percent }: { diff: number; percent: number | null }) {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Minus className="h-3 w-3" />
        変化なし
      </span>
    );
  }

  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        up ? "text-rose-600" : "text-emerald-600"
      }`}
    >
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {up ? "+" : ""}
      {formatAmount(diff)}
      {percent != null && `（${up ? "+" : ""}${percent}%）`}
    </span>
  );
}

export function AnalyticsDashboard() {
  const { savedVersion, notifyExpenseSaved } = useExpenseInput();
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoNote, setAutoNote] = useState<string | null>(null);

  const currentYm = getCurrentYearMonth();
  const prevYm = shiftYearMonth(currentYm, -1);
  const yearAgoYm = shiftYearMonth(currentYm, -12);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await getExpenses());
    } catch {
      setError("分析データの読み込みに失敗しました。");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRecurringChanged = useCallback(async () => {
    try {
      const applied = await applyDueRecurringExpenses();
      if (applied.createdCount > 0) {
        setAutoNote(`固定費を ${applied.createdCount} 件、自動追加しました`);
        notifyExpenseSaved();
      } else {
        setAutoNote(null);
        await load();
      }
    } catch {
      setError("固定費の反映に失敗しました。");
    }
  }, [load, notifyExpenseSaved]);

  useEffect(() => {
    load();
  }, [load, savedVersion]);

  const mom = useMemo(
    () => comparePeriods(expenses, currentYm, prevYm),
    [expenses, currentYm, prevYm],
  );

  const yoy = useMemo(
    () => comparePeriods(expenses, currentYm, yearAgoYm),
    [expenses, currentYm, yearAgoYm],
  );

  const fixedSplit = useMemo(
    () => splitFixedAndVariable(expenses, currentYm),
    [expenses, currentYm],
  );

  const categoryChanges = useMemo(
    () => getCategoryPeriodChanges(expenses, currentYm, prevYm).slice(0, 6),
    [expenses, currentYm, prevYm],
  );

  const { points: trendPoints, categories: trendCategories } = useMemo(
    () => aggregateCategoryTrends(expenses, 6, 5),
    [expenses],
  );

  const chartData = useMemo(
    () =>
      trendPoints.map((p) => ({
        label: p.label,
        total: p.total,
        ...p.amounts,
      })),
    [trendPoints],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
          onClick={load}
          className="mt-3 text-sm font-medium text-teal-700 underline"
        >
          再試行
        </button>
      </section>
    );
  }

  const monthLabel = formatYearMonthLabel(currentYm);
  const hasData = expenses.length > 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {autoNote && (
        <p className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
          {autoNote}
        </p>
      )}

      <RecurringExpensePanel onChanged={handleRecurringChanged} />

      {!hasData ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            支出データが貯まると、前月比・推移グラフが表示されます
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                {monthLabel} · 前月比
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {formatAmount(mom.currentTotal)}
              </p>
              <div className="mt-2">
                <DiffBadge diff={mom.diff} percent={mom.changePercent} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                前月 {formatAmount(mom.previousTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                {monthLabel} · 前年同月比
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {formatAmount(yoy.currentTotal)}
              </p>
              <div className="mt-2">
                <DiffBadge diff={yoy.diff} percent={yoy.changePercent} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {formatYearMonthLabel(yearAgoYm)} {formatAmount(yoy.previousTotal)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              固定費と変動費（{monthLabel}）
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-[11px] text-slate-500">固定費</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {formatAmount(fixedSplit.fixedTotal)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {fixedSplit.fixedCount} 件
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-[11px] text-slate-500">変動費</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {formatAmount(fixedSplit.variableTotal)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {fixedSplit.variableCount} 件
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              カテゴリ別の前月差
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              物価や使い方の変化が大きい項目
            </p>
            {categoryChanges.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">比較できるデータがありません</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {categoryChanges.map((row) => (
                  <li
                    key={row.category}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {row.category}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        前月 {formatAmount(row.previous)} → 今月{" "}
                        {formatAmount(row.current)}
                      </p>
                    </div>
                    <DiffBadge diff={row.diff} percent={null} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ItemPriceInsights expenses={expenses} />

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              カテゴリ推移（直近6か月）
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              金額の多いカテゴリの推移
            </p>
            <div className="mt-3 h-64">
              {trendCategories.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  表示できるカテゴリがありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={(v) =>
                        v >= 10000 ? `${v / 10000}万` : String(v)
                      }
                      width={40}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatAmount(Number(value ?? 0))}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {trendCategories.map((cat, i) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={TREND_COLORS[i % TREND_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              月別合計（直近6か月）
            </h2>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v) =>
                      v >= 10000 ? `${v / 10000}万` : String(v)
                    }
                    width={40}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatAmount(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
