"use client";

import { useEffect, useRef } from "react";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { applyDueRecurringExpenses } from "@/lib/recurring-expenses";

/** アプリ起動時に到来済み固定費を自動計上する */
export function RecurringAutoApply() {
  const { notifyExpenseSaved } = useExpenseInput();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    applyDueRecurringExpenses()
      .then((result) => {
        if (result.createdCount > 0) notifyExpenseSaved();
      })
      .catch(() => {
        /* 起動時は黙って失敗（画面側で再試行可能） */
      });
  }, [notifyExpenseSaved]);

  return null;
}
