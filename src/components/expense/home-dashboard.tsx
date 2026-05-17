"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight, Loader2, Minus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardChartPanel } from "@/components/expense/dashboard-chart-panel";
import { MonthSelector } from "@/components/expense/month-selector";
import { useExpenseInput } from "@/contexts/expense-input-context";
import {
  aggregateByCategory,
  aggregateDailyTotals,
  aggregateMonthlyTotals,
  getMonthSummary,
  hasAnyExpenseData,
} from "@/lib/expense-analytics";
import {
  formatAmount,
  formatYearMonthLabel,
  getCurrentYearMonth,
} from "@/lib/format";
import { getExpenses } from "@/lib/expenses";
import type { ExpenseDocument } from "@/types/expense";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-14 rounded-2xl bg-slate-200" />
      <div className="h-36 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 rounded-xl bg-slate-200" />
        <div className="h-16 rounded-xl bg-slate-200" />
        <div className="h-16 rounded-xl bg-slate-200" />
      </div>
      <div className="h-72 rounded-2xl bg-slate-200" />
    </div>
  );
}

function StatChip({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-teal-100/80">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-tight text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-teal-100/70">{sub}</p>}
    </div>
  );
}

function PrevMonthBadge({ diff }: { diff: number }) {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
        <Minus className="h-3 w-3" />
        先月と同額
      </span>
    );
  }

  const increased = diff > 0;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
      {increased ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      先月比 {increased ? "+" : ""}
      {formatAmount(diff)}
    </span>
  );
}

export function HomeDashboard() {
  const { savedVersion, openSheet } = useExpenseInput();
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = formatYearMonthLabel(selectedMonth);
  const isCurrentMonth = selectedMonth === getCurrentYearMonth();

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch {
      setError("データの読み込みに失敗しました。");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses, savedVersion]);

  const summary = useMemo(
    () => getMonthSummary(expenses, selectedMonth),
    [expenses, selectedMonth],
  );

  const dailyData = useMemo(
    () => aggregateDailyTotals(expenses, selectedMonth),
    [expenses, selectedMonth],
  );

  const categoryData = useMemo(
    () => aggregateByCategory(expenses, selectedMonth),
    [expenses, selectedMonth],
  );

  const monthlyData = useMemo(() => aggregateMonthlyTotals(expenses, 12), [expenses]);

  const hasData = hasAnyExpenseData(expenses);

  return (
    <div className="flex flex-1 flex-col gap-4 pb-2">
      <header className="pt-2">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">ホーム</h1>
        <p className="mt-1 text-sm text-slate-500">今月の支出をひと目で確認</p>
      </header>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
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
      ) : !hasData ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">支出を記録するとグラフが表示されます</p>
          <button
            type="button"
            onClick={openSheet}
            className="mt-4 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition active:scale-95"
          >
            最初の支出を入力
          </button>
        </section>
      ) : (
        <>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />

          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-5 text-white shadow-lg shadow-teal-900/25">
            <p className="text-sm font-medium text-teal-100">
              {monthLabel}
              {isCurrentMonth && "（今月）"}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
              {formatAmount(summary.total)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PrevMonthBadge diff={summary.diffFromPrev} />
              <span className="text-xs text-teal-100/80">{summary.count} 件</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatChip
                label="1日平均"
                value={formatAmount(summary.dailyAverage)}
                sub="※月末日数で按分"
              />
              <StatChip
                label="先月"
                value={formatAmount(summary.prevMonthTotal)}
              />
              <StatChip
                label="トップ項目"
                value={
                  summary.topCategory
                    ? summary.topCategory.name
                    : "—"
                }
                sub={
                  summary.topCategory
                    ? formatAmount(summary.topCategory.amount)
                    : undefined
                }
              />
            </div>
          </section>

          <DashboardChartPanel
            monthLabel={monthLabel}
            dailyData={dailyData}
            categoryData={categoryData}
            monthlyData={monthlyData}
          />

          <Link
            href="/history"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition active:bg-slate-50"
          >
            <span>{monthLabel}の明細をすべて見る</span>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>
        </>
      )}
    </div>
  );
}
