"use client";

import { Loader2, Pause, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RecurringExpenseSheet } from "@/components/expense/recurring-expense-sheet";
import { formatAmount } from "@/lib/format";
import {
  deleteRecurringExpense,
  getRecurringExpenses,
  updateRecurringExpense,
} from "@/lib/recurring-expenses";
import { getTransactionType } from "@/types/expense";
import type { RecurringExpenseDocument } from "@/types/recurring-expense";

type RecurringExpensePanelProps = {
  onChanged?: () => void;
};

export function RecurringExpensePanel({ onChanged }: RecurringExpensePanelProps) {
  const [items, setItems] = useState<RecurringExpenseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpenseDocument | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getRecurringExpenses());
    } catch {
      setError("固定費の読み込みに失敗しました。");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = async () => {
    await load();
    onChanged?.();
  };

  const toggleActive = async (item: RecurringExpenseDocument) => {
    setBusyId(item.id);
    try {
      await updateRecurringExpense(item.id, { active: !item.active });
      await load();
      onChanged?.();
    } catch {
      setError("更新に失敗しました。");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: RecurringExpenseDocument) => {
    if (!window.confirm(`「${item.itemName}」を削除しますか？`)) return;
    setBusyId(item.id);
    try {
      await deleteRecurringExpense(item.id);
      await load();
      onChanged?.();
    } catch {
      setError("削除に失敗しました。");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      id="recurring"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">固定収支</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            指定日になると自動で支出・収入に追加されます
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          追加
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : error ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 text-sm font-medium text-teal-700 underline"
          >
            再試行
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-slate-500">
            携帯・家賃などの固定支出や、給料などの固定収入を登録できます
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const busy = busyId === item.id;
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  item.active ? "" : "opacity-55"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.itemName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {getTransactionType(item) === "income" ? "収入" : "支出"} ·
                    毎月{item.dayOfMonth}日 · {item.category}
                    {!item.active && " · 停止中"}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    getTransactionType(item) === "income"
                      ? "text-sky-600"
                      : "text-rose-500"
                  }`}
                >
                  {getTransactionType(item) === "income" ? "+" : "-"}
                  {formatAmount(item.amount)}
                </p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(item);
                      setSheetOpen(true);
                    }}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="編集"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleActive(item)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label={item.active ? "停止" : "再開"}
                    title={item.active ? "停止" : "再開"}
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(item)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RecurringExpenseSheet
        open={sheetOpen}
        editing={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </section>
  );
}
