"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  filterExpenseSuggestions,
  fetchExpenseSuggestions,
  type ExpenseSuggestion,
} from "@/lib/expense-suggestions";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { createExpense } from "@/lib/expenses";
import { EXPENSE_CATEGORIES, type ExpenseInput } from "@/types/expense";

type ExpenseInputSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const createEmptyForm = (): ExpenseInput => ({
  itemName: "",
  amount: 0,
  category: EXPENSE_CATEGORIES[0],
  date: getTodayDateString(),
});

export function ExpenseInputSheet({ isOpen, onClose }: ExpenseInputSheetProps) {
  const router = useRouter();
  const { notifyExpenseSaved } = useExpenseInput();
  const formId = useId();
  const itemNameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ExpenseInput>(() => ({
    itemName: "",
    amount: 0,
    category: EXPENSE_CATEGORIES[0],
    date: "",
  }));
  const [amountText, setAmountText] = useState("");
  const [suggestions, setSuggestions] = useState<ExpenseSuggestion[]>([]);
  const [filtered, setFiltered] = useState<ExpenseSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setAmountText("");
    setError(null);
    setSuccess(false);
    setShowSuggestions(false);
    setFiltered([]);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    resetForm();
    setLoadingSuggestions(true);
    fetchExpenseSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));

    const timer = window.setTimeout(() => itemNameRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleItemNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, itemName: value }));
    setFiltered(filterExpenseSuggestions(suggestions, value));
    setShowSuggestions(value.trim().length > 0);
  };

  const applySuggestion = (suggestion: ExpenseSuggestion) => {
    setForm((prev) => ({
      ...prev,
      itemName: suggestion.itemName,
      amount: suggestion.amount,
      category: suggestion.category,
    }));
    setAmountText(String(suggestion.amount));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = Number(amountText.replace(/,/g, ""));
    if (!form.itemName.trim()) {
      setError("品名を入力してください");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("金額を正しく入力してください");
      return;
    }
    if (!form.category) {
      setError("カテゴリを選択してください");
      return;
    }
    if (!form.date) {
      setError("日付を選択してください");
      return;
    }

    setSubmitting(true);
    try {
      await createExpense({
        itemName: form.itemName.trim(),
        amount,
        category: form.category,
        date: form.date,
      });
      setSuccess(true);
      notifyExpenseSaved();
      router.refresh();
      window.setTimeout(() => {
        onClose();
      }, 600);
    } catch {
      setError("保存に失敗しました。接続を確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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

      <div
        className="pb-safe-lg relative mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id={`${formId}-title`} className="text-lg font-semibold text-slate-900">
            支出を入力
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
            <div className="relative">
              <label
                htmlFor={`${formId}-item`}
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                品名
              </label>
              <input
                ref={itemNameRef}
                id={`${formId}-item`}
                type="text"
                autoComplete="off"
                placeholder="例: スーパー、スタバ"
                value={form.itemName}
                onChange={(e) => handleItemNameChange(e.target.value)}
                onFocus={() => {
                  if (form.itemName.trim()) {
                    setFiltered(
                      filterExpenseSuggestions(suggestions, form.itemName),
                    );
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 150);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none ring-teal-600 focus:border-teal-500 focus:bg-white focus:ring-2"
              />

              {showSuggestions && filtered.length > 0 && (
                <ul
                  className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                  role="listbox"
                >
                  {filtered.map((s) => (
                    <li key={s.itemName} role="option">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-teal-50 active:bg-teal-100"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applySuggestion(s)}
                      >
                        <span className="font-medium text-slate-900">
                          {s.itemName}
                        </span>
                        <span className="shrink-0 text-sm text-slate-500">
                          ¥{s.amount.toLocaleString()} · {s.category}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {loadingSuggestions && form.itemName.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">履歴を読み込み中…</p>
              )}
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
                placeholder="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d]/g, ""))}
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
              保存しました
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-base font-semibold text-white shadow-md shadow-teal-600/25 transition hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                保存中…
              </>
            ) : (
              "保存する"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
