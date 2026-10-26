"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  createRecurringExpense,
  updateRecurringExpense,
} from "@/lib/recurring-expenses";
import { getCurrentYearMonth } from "@/lib/format";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getTransactionType,
} from "@/types/expense";
import type {
  RecurringExpenseDocument,
  RecurringExpenseFormValues,
} from "@/types/recurring-expense";

type RecurringExpenseSheetProps = {
  open: boolean;
  editing: RecurringExpenseDocument | null;
  onClose: () => void;
  onSaved: () => void;
};

function createEmptyForm(): RecurringExpenseFormValues {
  return {
    itemName: "",
    amount: 0,
    category: EXPENSE_CATEGORIES[0],
    dayOfMonth: 1,
    startYearMonth: getCurrentYearMonth(),
    active: true,
    type: "expense",
  };
}

export function RecurringExpenseSheet({
  open,
  editing,
  onClose,
  onSaved,
}: RecurringExpenseSheetProps) {
  const formId = useId();
  const [form, setForm] = useState<RecurringExpenseFormValues>(createEmptyForm);
  const [amountText, setAmountText] = useState("");
  const [dayText, setDayText] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories =
    form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!open) return;

    if (editing) {
      const type = getTransactionType(editing);
      setForm({
        itemName: editing.itemName,
        amount: editing.amount,
        category: editing.category,
        dayOfMonth: editing.dayOfMonth,
        startYearMonth: editing.startYearMonth,
        active: editing.active,
        type,
      });
      setAmountText(String(editing.amount));
      setDayText(String(editing.dayOfMonth));
    } else {
      setForm(createEmptyForm());
      setAmountText("");
      setDayText("1");
    }
    setError(null);
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = Number(amountText.replace(/,/g, ""));
    const dayOfMonth = Number(dayText);

    if (!form.itemName.trim()) {
      setError("品名を入力してください");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("金額を正しく入力してください");
      return;
    }
    if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      setError("日付は1〜31の範囲で入力してください");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.startYearMonth)) {
      setError("開始月を選択してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      itemName: form.itemName.trim(),
      amount,
      category: form.category,
      dayOfMonth,
      startYearMonth: form.startYearMonth,
      active: form.active,
      type: form.type,
    };

    try {
      if (editing) {
        await updateRecurringExpense(editing.id, payload);
      } else {
        await createRecurringExpense(payload);
      }
      onSaved();
      onClose();
    } catch {
      setError("保存に失敗しました。接続と Firestore ルールを確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  const title = editing ? "固定収支を編集" : "固定収支を追加";

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
            {title}
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
          <div className="flex flex-col gap-4">
            <div className="flex overflow-hidden rounded-full border border-slate-200">
              {(["expense", "income"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      type: value,
                      category:
                        value === "income"
                          ? INCOME_CATEGORIES[0]
                          : EXPENSE_CATEGORIES[0],
                    }))
                  }
                  className={`flex-1 py-2 text-sm font-semibold ${
                    form.type === value
                      ? "bg-slate-100 text-teal-700"
                      : "text-slate-500"
                  }`}
                >
                  {value === "expense" ? "固定支出" : "固定収入"}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">品名</span>
              <input
                type="text"
                value={form.itemName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, itemName: e.target.value }))
                }
                placeholder={
                  form.type === "income"
                    ? "例: 給料"
                    : "例: 携帯料金、家賃"
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">金額</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="5000"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">カテゴリ</span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">
                毎月の計上日
              </span>
              <input
                type="number"
                min={1}
                max={31}
                value={dayText}
                onChange={(e) => setDayText(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              <span className="text-xs text-slate-500">
                31日指定でも、短い月は末日に計上されます
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">開始月</span>
              <input
                type="month"
                value={form.startYearMonth}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    startYearMonth: e.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span className="text-sm font-medium text-slate-700">有効</span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, active: e.target.checked }))
                }
                className="h-5 w-5 accent-teal-600"
              />
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 py-3 text-sm font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "更新する" : "追加する"}
          </button>
        </form>
      </div>
    </div>
  );
}
