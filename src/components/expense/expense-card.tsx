import { formatAmount, formatDisplayDate } from "@/lib/format";
import type { ExpenseDocument } from "@/types/expense";

type ExpenseCardProps = {
  expense: ExpenseDocument;
  compact?: boolean;
};

export function ExpenseCard({ expense, compact }: ExpenseCardProps) {
  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm ${
        compact ? "p-3.5" : "p-4"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-teal-50 font-semibold text-teal-800 ${
          compact ? "h-10 w-10 text-xs" : "h-11 w-11 text-sm"
        }`}
      >
        {expense.category.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{expense.itemName}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatDisplayDate(expense.date)} · {expense.category}
        </p>
      </div>
      <p
        className={`shrink-0 font-bold tabular-nums text-slate-900 ${
          compact ? "text-base" : "text-lg"
        }`}
      >
        {formatAmount(expense.amount)}
      </p>
    </article>
  );
}
