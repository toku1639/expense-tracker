"use client";

import { Loader2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { CategoryIconBadge } from "@/lib/category-icons";
import { PaymentMethodPicker } from "@/components/expense/payment-method-picker";
import { deleteExpense, updateExpense } from "@/lib/expenses";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getTransactionType,
  type ExpenseDocument,
  type ExpenseInput,
  type PaymentMethod,
  type TransactionType,
} from "@/types/expense";

type ExpenseEditSheetProps = {
  expense: ExpenseDocument | null;
  onClose: () => void;
};

export function ExpenseEditSheet({ expense, onClose }: ExpenseEditSheetProps) {
  const router = useRouter();
  const { notifyExpenseSaved } = useExpenseInput();
  const formId = useId();

  const [type, setType] = useState<TransactionType>("expense");
  const [form, setForm] = useState<ExpenseInput>({
    itemName: "",
    amount: 0,
    category: EXPENSE_CATEGORIES[0],
    date: "",
    type: "expense",
    paymentMethod: "cash",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountText, setAmountText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categoryOptions = useMemo(() => {
    const base =
      type === "income"
        ? [...INCOME_CATEGORIES]
        : [...EXPENSE_CATEGORIES];
    if (form.category && !base.includes(form.category as never)) {
      return [form.category, ...base];
    }
    return base;
  }, [type, form.category]);

  const resetFromExpense = useCallback((target: ExpenseDocument) => {
    const t = getTransactionType(target);
    setType(t);
    setForm({
      itemName: target.itemName,
      amount: target.amount,
      category: target.category,
      date: target.date,
      type: t,
      paymentMethod: target.paymentMethod ?? "cash",
    });
    setPaymentMethod(target.paymentMethod ?? "cash");
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
      type,
      paymentMethod: type === "expense" ? paymentMethod : undefined,
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
          <h2
            id={`${formId}-title`}
            className="text-lg font-semibold text-slate-900"
          >
            {type === "income" ? "収入を編集" : "支出を編集"}
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

        <form
          onSubmit={handleSubmit}
          className="max-h-[75dvh] overflow-y-auto px-4 py-4"
        >
          <div className="space-y-4">
            <div className="flex overflow-hidden rounded-full border border-slate-200">
              {(["expense", "income"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setType(value);
                    setForm((prev) => ({
                      ...prev,
                      type: value,
                      category:
                        value === "income"
                          ? INCOME_CATEGORIES[0]
                          : EXPENSE_CATEGORIES[0],
                    }));
                  }}
                  className={`flex-1 py-2 text-sm font-semibold ${
                    type === value
                      ? "bg-slate-100 text-teal-700"
                      : "text-slate-500"
                  }`}
                >
                  {value === "expense" ? "支出" : "収入"}
                </button>
              ))}
            </div>

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
                placeholder="例: スーパー、スタバ"
                value={form.itemName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, itemName: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-semibold tabular-nums outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {type === "expense" && (
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
            )}

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                カテゴリ
              </span>
              <div className="grid grid-cols-3 gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, category: cat }))
                    }
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 ${
                      form.category === cat
                        ? "border-slate-400"
                        : "border-slate-200"
                    }`}
                  >
                    <CategoryIconBadge category={cat} type={type} size="sm" />
                    <span className="text-[11px] font-medium text-slate-700">
                      {cat}
                    </span>
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
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
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-60"
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
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 disabled:opacity-60"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                削除中…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                この取引を削除
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
