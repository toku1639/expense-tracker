"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBudgetsForMonth } from "@/lib/budgets";
import { getBudgetOverview } from "@/lib/budget-summary";
import { formatAmount, getCurrentYearMonth } from "@/lib/format";
import { getExpenses } from "@/lib/expenses";
import { useExpenseInput } from "@/contexts/expense-input-context";

export function BudgetRemainingBanner() {
  const { savedVersion } = useExpenseInput();
  const [text, setText] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const yearMonth = getCurrentYearMonth();

    Promise.all([getExpenses(), getBudgetsForMonth(yearMonth)])
      .then(([expenses, budgets]) => {
        if (cancelled) return;
        const overview = getBudgetOverview(expenses, budgets, yearMonth);
        if (!overview.hasBudget) {
          setText(null);
          return;
        }
        setOver(overview.overBudget);
        setText(
          overview.overBudget
            ? `予算を ${formatAmount(Math.abs(overview.remaining))} 超過`
            : `今月の予算残 ${formatAmount(overview.remaining)}`,
        );
      })
      .catch(() => {
        if (!cancelled) setText(null);
      });

    return () => {
      cancelled = true;
    };
  }, [savedVersion]);

  if (!text) return null;

  return (
    <Link
      href="/budget/"
      className={`block rounded-xl px-3 py-2.5 text-center text-sm font-semibold ${
        over
          ? "bg-rose-50 text-rose-700"
          : "bg-teal-50 text-teal-800"
      }`}
    >
      {text}
      <span className="ml-2 text-xs font-medium underline underline-offset-2">
        予算を見る
      </span>
    </Link>
  );
}
