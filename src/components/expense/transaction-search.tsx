"use client";

import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryIconBadge } from "@/lib/category-icons";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { formatAmount, formatDisplayDate } from "@/lib/format";
import { getExpenses } from "@/lib/expenses";
import {
  getPaymentMethodLabel,
  getTransactionType,
  PAYMENT_METHODS,
  type ExpenseDocument,
  type PaymentMethod,
  type TransactionType,
} from "@/types/expense";

type TypeFilter = "all" | TransactionType;
type PaymentFilter = "all" | PaymentMethod;

export function TransactionSearch() {
  const { savedVersion, openEditSheet } = useExpenseInput();
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await getExpenses());
    } catch {
      setError("検索データの読み込みに失敗しました。");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, savedVersion]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      const type = getTransactionType(e);
      if (typeFilter !== "all" && type !== typeFilter) return false;

      if (paymentFilter !== "all") {
        if (type === "income") return false;
        const method = e.paymentMethod ?? "cash";
        if (method !== paymentFilter) return false;
      }

      if (!q) return true;
      const hay = `${e.itemName} ${e.category} ${e.date} ${e.amount}`.toLowerCase();
      return hay.includes(q);
    });
  }, [expenses, query, typeFilter, paymentFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
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

  return (
    <div className="flex flex-col gap-4 pb-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="品名・カテゴリ・金額で検索"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "すべて"],
            ["expense", "支出"],
            ["income", "収入"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTypeFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              typeFilter === id
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPaymentFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            paymentFilter === "all"
              ? "bg-slate-800 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          支払すべて
        </button>
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setPaymentFilter(m.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              paymentFilter === m.id
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{results.length} 件</p>

      {results.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
          該当する取引がありません
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {results.slice(0, 100).map((row) => {
            const t = getTransactionType(row);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => openEditSheet(row)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <CategoryIconBadge category={row.category} type={t} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {row.itemName || row.category}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDisplayDate(row.date)} · {row.category}
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
    </div>
  );
}
