"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BudgetRemainingBanner } from "@/components/expense/budget-remaining-banner";
import { PaymentMethodPicker } from "@/components/expense/payment-method-picker";
import { ReceiptCameraSection } from "@/components/expense/receipt-camera-section";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { CategoryIconBadge } from "@/lib/category-icons";
import { createExpense } from "@/lib/expenses";
import {
  fetchExpenseSuggestions,
  filterExpenseSuggestions,
  type ExpenseSuggestion,
} from "@/lib/expense-suggestions";
import {
  formatFullDateLabel,
  getLocalTodayString,
  shiftDateString,
} from "@/lib/format";
import {
  getLastPaymentMethod,
  rememberLastPaymentMethod,
} from "@/lib/receipt-enrich";
import type { ReceiptScanResult } from "@/lib/receipt-scan";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  normalizePaymentMethod,
  type PaymentMethod,
  type TransactionType,
} from "@/types/expense";

type TransactionInputFormProps = {
  initialDate?: string;
  initialType?: TransactionType;
};

export function TransactionInputForm({
  initialDate,
  initialType = "expense",
}: TransactionInputFormProps) {
  const { notifyExpenseSaved, savedVersion } = useExpenseInput();
  const formId = useId();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TransactionType>(initialType);
  const [date, setDate] = useState(initialDate || getLocalTodayString);
  const [itemName, setItemName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<ExpenseSuggestion[]>([]);
  const [filtered, setFiltered] = useState<ExpenseSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    const last = normalizePaymentMethod(getLastPaymentMethod());
    if (last) setPaymentMethod(last);
  }, []);

  const categories =
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    setCategory(
      type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    );
    setShowSuggestions(false);
    setFiltered([]);
  }, [type]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSuggestions(true);
    fetchExpenseSuggestions(type)
      .then((rows) => {
        if (!cancelled) setSuggestions(rows);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, savedVersion]);

  const resetAfterSave = useCallback(() => {
    setItemName("");
    setAmountText("");
    setSuccess(false);
    setShowSuggestions(false);
    setFiltered([]);
  }, []);

  const handleItemNameChange = (value: string) => {
    setItemName(value);
    setFiltered(filterExpenseSuggestions(suggestions, value));
    setShowSuggestions(value.trim().length > 0);
  };

  const applySuggestion = (suggestion: ExpenseSuggestion) => {
    setItemName(suggestion.itemName);
    setAmountText(String(suggestion.amount));
    setCategory(suggestion.category);
    setShowSuggestions(false);
    setFiltered([]);
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      /* showPicker が拒否された場合は focus にフォールバック */
    }
    input.focus();
    input.click();
  };

  const applyReceiptScan = (result: ReceiptScanResult, receiptDate?: string) => {
    setType("expense");
    setItemName(result.itemName);
    setAmountText(String(result.amount));
    setCategory(result.category);
    if (receiptDate) setDate(receiptDate);
  };

  const saveReceiptItems = async (
    items: ReceiptScanResult[],
    receiptDate: string,
    receiptPaymentMethod: PaymentMethod,
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      setPaymentMethod(receiptPaymentMethod);
      rememberLastPaymentMethod(receiptPaymentMethod);
      for (const item of items) {
        await createExpense({
          itemName: item.itemName.trim(),
          amount: item.amount,
          category: item.category,
          date: receiptDate,
          type: "expense",
          paymentMethod: receiptPaymentMethod,
        });
      }
      setSuccess(true);
      notifyExpenseSaved();
      window.setTimeout(resetAfterSave, 800);
    } catch {
      setError("保存に失敗しました。接続を確認してください。");
      throw new Error("save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = Number(amountText.replace(/,/g, ""));
    if (!itemName.trim()) {
      setError("品名を入力してください");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("金額を正しく入力してください");
      return;
    }
    if (!category) {
      setError("カテゴリを選択してください");
      return;
    }

    setSubmitting(true);
    try {
      if (type === "expense") rememberLastPaymentMethod(paymentMethod);
      await createExpense({
        itemName: itemName.trim(),
        amount,
        category,
        date,
        type,
        paymentMethod: type === "expense" ? paymentMethod : undefined,
      });
      setSuccess(true);
      notifyExpenseSaved();
      window.setTimeout(resetAfterSave, 800);
    } catch {
      setError("保存に失敗しました。接続を確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-4">
      <BudgetRemainingBanner />

      <div className="mx-auto flex w-full max-w-xs overflow-hidden rounded-full border border-slate-200">
        {(["expense", "income"] as const).map((value) => {
          const active = type === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-slate-100 text-teal-700"
                  : "bg-white text-slate-500"
              }`}
            >
              {value === "expense" ? "支出" : "収入"}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-100 py-3">
        <span className="w-14 shrink-0 text-sm font-semibold text-slate-700">
          日付
        </span>
        <button
          type="button"
          aria-label="前の日"
          onClick={() => setDate((d) => shiftDateString(d, -1))}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={openDatePicker}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-teal-100"
            aria-label="日付をカレンダーから選ぶ"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-teal-700" />
            <span className="truncate">{formatFullDateLabel(date)}</span>
          </button>
          {/* ネイティブの日付ピッカー（中央タップで開く） */}
          <input
            ref={dateInputRef}
            id={`${formId}-date`}
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>

        <button
          type="button"
          aria-label="次の日"
          onClick={() => setDate((d) => shiftDateString(d, 1))}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="relative border-b border-slate-100 py-3">
        <label className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-sm font-semibold text-slate-700">
            品名
          </span>
          <input
            id={`${formId}-item`}
            type="text"
            autoComplete="off"
            value={itemName}
            onChange={(e) => handleItemNameChange(e.target.value)}
            onFocus={() => {
              if (itemName.trim()) {
                setFiltered(filterExpenseSuggestions(suggestions, itemName));
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="例: スーパー、スタバ"
            className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>

        {showSuggestions && filtered.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            role="listbox"
          >
            {filtered.map((s) => (
              <li key={`${s.type}-${s.itemName}`} role="option">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-teal-50 active:bg-teal-100"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(s)}
                >
                  <span className="min-w-0 truncate font-medium text-slate-900">
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

        {loadingSuggestions && itemName.length === 0 && (
          <p className="mt-1 pl-14 text-xs text-slate-400">履歴を読み込み中…</p>
        )}
      </div>

      <label className="flex items-center gap-3 border-b border-slate-100 py-3">
        <span className="w-14 shrink-0 text-sm font-semibold text-slate-700">
          {type === "income" ? "収入" : "支出"}
        </span>
        <input
          id={`${formId}-amount`}
          type="text"
          inputMode="numeric"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="0"
          className="flex-1 rounded-xl bg-teal-50 px-3 py-2 text-2xl font-bold tabular-nums text-slate-900 outline-none"
        />
        <span className="text-sm font-medium text-slate-500">円</span>
      </label>

      {type === "expense" && (
        <>
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
          />
          <ReceiptCameraSection
            formDate={date}
            onApplyItem={applyReceiptScan}
            onReceiptDate={setDate}
            onSaveSelected={saveReceiptItems}
            initialPaymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            disabled={submitting}
          />
        </>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">カテゴリー</p>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => {
            const selected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border bg-white px-2 py-3 transition ${
                  selected
                    ? "border-slate-400 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <CategoryIconBadge category={cat} type={type} />
                <span className="text-xs font-medium text-slate-700">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-teal-700" role="status">
          保存しました
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 py-3.5 text-base font-semibold text-white shadow-md shadow-teal-600/25 transition active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            保存中…
          </>
        ) : type === "income" ? (
          "収入を入力する"
        ) : (
          "支出を入力する"
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        家賃・携帯・サブスクなど毎月決まっているものは
        <Link
          href="/menu/#recurring"
          className="mx-1 font-semibold text-teal-700 underline underline-offset-2"
        >
            メニューの固定収支
        </Link>
        から設定できます
      </p>
    </form>
  );
}
