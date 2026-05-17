"use client";

import { Pencil } from "lucide-react";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { formatAmount, formatDisplayDate } from "@/lib/format";
import type { ExpenseDocument } from "@/types/expense";

type ExpenseHistoryTableProps = {
  rows: ExpenseDocument[];
  showCategory?: boolean;
};

export function ExpenseHistoryTable({
  rows,
  showCategory = false,
}: ExpenseHistoryTableProps) {
  const { openEditSheet } = useExpenseInput();

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[300px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">日付</th>
            <th className="px-3 py-2.5 font-medium">品名</th>
            {showCategory && (
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">項目</th>
            )}
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">
              金額
            </th>
            <th className="w-9 px-1 py-2.5" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((expense) => (
            <tr
              key={expense.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-teal-50/80 active:bg-teal-100/60"
              onClick={() => openEditSheet(expense)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEditSheet(expense);
                }
              }}
            >
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                {formatDisplayDate(expense.date)}
              </td>
              <td className="max-w-[140px] truncate px-3 py-2.5 font-medium text-slate-900">
                {expense.itemName}
              </td>
              {showCategory && (
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                  {expense.category}
                </td>
              )}
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                {formatAmount(expense.amount)}
              </td>
              <td className="px-2 py-2.5 text-teal-600/70">
                <Pencil className="mx-auto h-4 w-4" aria-hidden />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type CategoryGroupTableProps = {
  category: string;
  total: number;
  count: number;
  expenses: ExpenseDocument[];
};

export function CategoryGroupTable({
  category,
  total,
  count,
  expenses,
}: CategoryGroupTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-teal-100 bg-teal-50 px-3 py-2.5">
        <span className="font-semibold text-teal-900">{category}</span>
        <span className="shrink-0 text-sm font-medium tabular-nums text-teal-700">
          {formatAmount(total)}
          <span className="ml-1.5 text-xs font-normal text-teal-600/80">
            {count}件
          </span>
        </span>
      </div>
      <ExpenseHistoryTable rows={expenses} showCategory={false} />
    </section>
  );
}
