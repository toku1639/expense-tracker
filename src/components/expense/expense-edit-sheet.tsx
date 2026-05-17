"use client";

import { Loader2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { deleteExpense, updateExpense } from "@/lib/expenses";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseDocument,
  type ExpenseInput,
} from "@/types/expense";

type ExpenseEditSheetProps = {
  expense: ExpenseDocument | null;
  onClose: () => void;
};

function normalizeCategory(category: string): ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory)
    ? (category as ExpenseCategory)
    : "その他";
}

export function ExpenseEditSheet({ expense, onClose }: ExpenseEditSheetProps) {
  const router = useRouter();
  const { notifyExpenseSaved } = useExpenseInput();
  const formId = useId();

  const [form, setForm] = useState<ExpenseInput>({
    itemName: "",
    amount: 0,
    category: EXPENSE_CATEGORIES[0],
    date: "",
  });
  const [amountText, setAmountText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetFromExpense = useCallback((target: ExpenseDocument) => {
    setForm({
      itemName: target.itemName,
      amount: target.amount,
      category: normalizeCategory(target.category),
      date: target.date,
    });
    setAmountText(String(target.amount));
    setError(null);
    setSuccess(false);
  }, []);

  useEffect(() => {
    if (!expense) return;
    resetFromExpense(expense);
  }, [expense, resetFromExpense]);

  useEffect(() => {
    if (!expense) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [expense, onClose]);

  const buildPayload = (): ExpenseInput | null => {
    const amount = Number(amountText.replace(/,/g, ""));
    if (!form.itemName.trim()) {
      setError("品名を入力してください");
      return null;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("金額を正しく入力してください");
      return null;
    }
    if (!form.date) {
      setError("日付を選択してください");
      return null;
    }
    return {
      itemName: form.itemName.trim(),
      amount,
      category: form.category,
      date: form.date,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    setError(null);
    const payload = buildPayload();
    if (!payload) return;

    setSubmitting(true);
    try {
      await updateExpense(expense.id, payload);
      setSuccess(true);
      notifyExpenseSaved();
      router.refresh();
      window.setTimeout(() => onClose(), 500);
    } catch {
      setError("更新に失敗しました。接続を確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    if (
      !window.confirm(
        `「${expense.itemName}」を削除しますか？\nこの操作は取り消せません。`,
      )
    ) {
      return;
    }

    setError(null);
    setDeleting(true);
    try {
      await deleteExpense(expense.id);
      notifyExpenseSaved();
      router.refresh();
      onClose();
    } catch {
      setError("削除に失敗しました。接続を確認してください。");
    } finally {
      setDeleting(false);
    }
  };

  if (!expense) return null;

  const busy = submitting || deleting;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="閉じる"
        onClick={onClose}
      />

      <div className="pb-safe-lg relative mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id={`${formId}-title`} className="text-lg font-semibold text-slate-900">
            支出を編集
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75dvh] overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            <div>
              <label
                htmlFor={`${formId}-item`}
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                品名
              </label>
              <input
                id={`${formId}-item`}
                type="text"
                autoComplete="off"
                value={form.itemName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, itemName: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none ring-teal-600 focus:border-teal-500 focus:bg-white focus:ring-2"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-amount`}
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                金額（円）
              </label>
              <input
                id={`${formId}-amount`}
                type="text"
                inputMode="numeric"
                value={amountText}
                onChange={(e) =>
                  setAmountText(e.target.value.replace(/[^\d]/g, ""))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-semibold tabular-nums outline-none ring-teal-600 focus:border-teal-500 focus:bg-white focus:ring-2"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                カテゴリ
              </span>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      form.category === cat
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor={`${formId}-date`}
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                日付
              </label>
              <input
                id={`${formId}-date`}
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none ring-teal-600 focus:border-teal-500 focus:bg-white focus:ring-2"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 text-sm text-teal-700" role="status">
              更新しました
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-base font-semibold text-white shadow-md shadow-teal-600/25 transition hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                更新中…
              </>
            ) : (
              "変更を保存"
            )}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                削除中…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                この支出を削除
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
