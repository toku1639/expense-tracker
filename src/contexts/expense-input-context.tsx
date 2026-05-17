"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ExpenseDocument } from "@/types/expense";

const ExpenseInputSheet = dynamic(
  () =>
    import("@/components/expense/expense-input-sheet").then(
      (m) => m.ExpenseInputSheet,
    ),
  { ssr: false },
);

const ExpenseEditSheet = dynamic(
  () =>
    import("@/components/expense/expense-edit-sheet").then(
      (m) => m.ExpenseEditSheet,
    ),
  { ssr: false },
);

type ExpenseInputContextValue = {
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  editingExpense: ExpenseDocument | null;
  openEditSheet: (expense: ExpenseDocument) => void;
  closeEditSheet: () => void;
  /** 支出保存後に一覧を再取得するためのトリガー */
  savedVersion: number;
  notifyExpenseSaved: () => void;
};

const ExpenseInputContext = createContext<ExpenseInputContextValue | null>(
  null,
);

export function ExpenseInputProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDocument | null>(
    null,
  );
  const [savedVersion, setSavedVersion] = useState(0);

  const closeEditSheet = useCallback(() => setEditingExpense(null), []);

  const openSheet = useCallback(() => {
    setEditingExpense(null);
    setIsOpen(true);
  }, []);

  const closeSheet = useCallback(() => setIsOpen(false), []);

  const openEditSheet = useCallback((expense: ExpenseDocument) => {
    setIsOpen(false);
    setEditingExpense(expense);
  }, []);

  const notifyExpenseSaved = useCallback(
    () => setSavedVersion((v) => v + 1),
    [],
  );

  const value = useMemo(
    () => ({
      isOpen,
      openSheet,
      closeSheet,
      editingExpense,
      openEditSheet,
      closeEditSheet,
      savedVersion,
      notifyExpenseSaved,
    }),
    [
      isOpen,
      openSheet,
      closeSheet,
      editingExpense,
      openEditSheet,
      closeEditSheet,
      savedVersion,
      notifyExpenseSaved,
    ],
  );

  return (
    <ExpenseInputContext.Provider value={value}>
      {children}
      <ExpenseInputSheet isOpen={isOpen} onClose={closeSheet} />
      <ExpenseEditSheet expense={editingExpense} onClose={closeEditSheet} />
    </ExpenseInputContext.Provider>
  );
}

export function useExpenseInput() {
  const ctx = useContext(ExpenseInputContext);
  if (!ctx) {
    throw new Error("useExpenseInput must be used within ExpenseInputProvider");
  }
  return ctx;
}
