"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CategoryGroupTable,
  ExpenseHistoryTable,
} from "@/components/expense/expense-history-table";
import { BudgetRemainingBanner } from "@/components/expense/budget-remaining-banner";
import { CategoryIconBadge } from "@/lib/category-icons";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { groupByCategory } from "@/lib/expense-analytics";
import {
  formatAmount,
  formatYearMonthLabel,
  getCurrentYearMonth,
  getLocalTodayString,
  shiftYearMonth,
} from "@/lib/format";
import { getExpenses } from "@/lib/expenses";
import {
  getPaymentMethodLabel,
  getTransactionType,
  isExpenseTransaction,
  type ExpenseDocument,
} from "@/types/expense";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type MainTab = "calendar" | "history";
type HistoryMode = "category" | "date";

function buildMonthCells(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startWeekday = first.getDay();

  const cells: { date: string; day: number; inMonth: boolean }[] = [];

  const prevYm = shiftYearMonth(yearMonth, -1);
  const [, pm] = prevYm.split("-").map(Number);
  const prevLast = new Date(Number(prevYm.slice(0, 4)), pm, 0).getDate();

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevLast - i;
    cells.push({
      date: `${prevYm}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: `${yearMonth}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: true,
    });
  }

  let nextDay = 1;
  const nextYm = shiftYearMonth(yearMonth, 1);
  while (cells.length % 7 !== 0) {
    cells.push({
      date: `${nextYm}-${String(nextDay).padStart(2, "0")}`,
      day: nextDay,
      inMonth: false,
    });
    nextDay += 1;
  }

  return cells;
}

function groupIncomeByCategory(expenses: ExpenseDocument[]) {
  const map = new Map<string, ExpenseDocument[]>();
  for (const expense of expenses) {
    if (expense.type !== "income") continue;
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

export function CalendarView() {
  const { savedVersion, openEditSheet } = useExpenseInput();
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [selectedDate, setSelectedDate] = useState(getLocalTodayString);
  const [mainTab, setMainTab] = useState<MainTab>("calendar");
  const [historyMode, setHistoryMode] = useState<HistoryMode>("date");
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await getExpenses());
    } catch {
      setError("データの読み込みに失敗しました。");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, savedVersion]);

  const cells = useMemo(() => buildMonthCells(yearMonth), [yearMonth]);

  const dayTotals = useMemo(() => {
    const map = new Map<string, { expense: number; income: number }>();
    for (const row of expenses) {
      const cur = map.get(row.date) ?? { expense: 0, income: 0 };
      if (isExpenseTransaction(row)) cur.expense += row.amount;
      else cur.income += row.amount;
      map.set(row.date, cur);
    }
    return map;
  }, [expenses]);

  const monthRows = useMemo(
    () => expenses.filter((e) => e.date.startsWith(yearMonth)),
    [expenses, yearMonth],
  );

  const monthIncome = useMemo(
    () =>
      monthRows
        .filter((e) => e.type === "income")
        .reduce((s, e) => s + e.amount, 0),
    [monthRows],
  );

  const monthExpense = useMemo(
    () =>
      monthRows
        .filter((e) => isExpenseTransaction(e))
        .reduce((s, e) => s + e.amount, 0),
    [monthRows],
  );

  const selectedRows = useMemo(
    () =>
      expenses
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [expenses, selectedDate],
  );

  const expenseGroups = useMemo(
    () => groupByCategory(monthRows),
    [monthRows],
  );

  const incomeGroups = useMemo(
    () => groupIncomeByCategory(monthRows),
    [monthRows],
  );

  const sortedByDate = useMemo(
    () => [...monthRows].sort((a, b) => a.date.localeCompare(b.date)),
    [monthRows],
  );

  const balance = monthIncome - monthExpense;

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

  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  return (
    <div className="flex flex-col gap-4 pb-4">
      <BudgetRemainingBanner />

      <div className="flex justify-end">
        <Link
          href="/search/"
          className="text-xs font-semibold text-teal-700 underline underline-offset-2"
        >
          取引を検索
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-xs overflow-hidden rounded-full border border-slate-200">
        {(
          [
            ["calendar", "カレンダー"],
            ["history", "履歴"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMainTab(value)}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              mainTab === value
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
            {m}月1日－{m}月{lastDay}日
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

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="text-center">
          <p className="text-[11px] text-slate-500">収入</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-sky-600">
            {formatAmount(monthIncome)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-slate-500">支出</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-rose-500">
            {formatAmount(monthExpense)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-slate-500">合計</p>
          <p
            className={`mt-1 text-sm font-bold tabular-nums ${
              balance >= 0 ? "text-sky-600" : "text-rose-500"
            }`}
          >
            {balance >= 0 ? "+" : ""}
            {formatAmount(balance)}
          </p>
        </div>
      </div>

      {mainTab === "calendar" ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-7 bg-slate-50">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={`py-2 text-center text-xs font-medium ${
                    i === 0
                      ? "text-red-500"
                      : i === 6
                        ? "text-blue-500"
                        : "text-slate-500"
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell) => {
                const totals = dayTotals.get(cell.date);
                const selected = cell.date === selectedDate;
                const weekday = new Date(cell.date).getDay();
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cell.date);
                      if (!cell.inMonth) {
                        setYearMonth(cell.date.slice(0, 7));
                      }
                    }}
                    className={`min-h-[4.25rem] border-t border-slate-100 p-1 text-left ${
                      selected ? "bg-teal-50" : "bg-white"
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        !cell.inMonth
                          ? "text-slate-300"
                          : weekday === 0
                            ? "text-red-500"
                            : weekday === 6
                              ? "text-blue-500"
                              : "text-slate-700"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {totals && (totals.expense > 0 || totals.income > 0) && (
                      <div className="mt-0.5 space-y-0.5">
                        {totals.income > 0 && (
                          <p className="truncate text-[9px] font-medium text-sky-600">
                            +{totals.income.toLocaleString()}
                          </p>
                        )}
                        {totals.expense > 0 && (
                          <p className="truncate text-[9px] font-medium text-rose-500">
                            -{totals.expense.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                選択日の明細
              </h2>
              <p className="text-xs text-slate-500">{selectedDate}</p>
            </div>
            {selectedRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                この日の取引はありません
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {selectedRows.map((row) => {
                  const t = getTransactionType(row);
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => openEditSheet(row)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <CategoryIconBadge
                          category={row.category}
                          type={t}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {row.itemName || row.category}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {row.category}
                            {t === "expense"
                              ? ` · ${getPaymentMethodLabel(row.paymentMethod)}`
                              : ""}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            t === "income" ? "text-sky-600" : "text-rose-500"
                          }`}
                        >
                          {t === "income" ? "+" : "-"}
                          {formatAmount(row.amount)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 pb-3 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">月の明細</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {monthRows.length} 件 · 行をタップして編集
            </p>
          </div>

          <div className="flex gap-1 p-2">
            {(
              [
                ["date", "日付順"],
                ["category", "項目別"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setHistoryMode(id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
                  historyMode === id
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-2 pb-3 pt-1">
            {monthRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                この月の取引はありません
              </p>
            ) : historyMode === "date" ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <ExpenseHistoryTable rows={sortedByDate} showCategory />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {expenseGroups.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <p className="px-1 text-xs font-semibold text-slate-500">
                      支出
                    </p>
                    {expenseGroups.map((group) => (
                      <CategoryGroupTable
                        key={`expense-${group.category}`}
                        category={group.category}
                        total={group.total}
                        count={group.count}
                        expenses={group.expenses}
                      />
                    ))}
                  </div>
                )}
                {incomeGroups.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <p className="px-1 text-xs font-semibold text-slate-500">
                      収入
                    </p>
                    {incomeGroups.map((group) => (
                      <CategoryGroupTable
                        key={`income-${group.category}`}
                        category={group.category}
                        total={group.total}
                        count={group.count}
                        expenses={group.expenses}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
