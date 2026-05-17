"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ExpenseInputSheet = dynamic(
  () =>
    import("@/components/expense/expense-input-sheet").then(
      (m) => m.ExpenseInputSheet,
    ),
  { ssr: false },
);

type ExpenseInputContextValue = {
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
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
  const [savedVersion, setSavedVersion] = useState(0);

  const openSheet = useCallback(() => setIsOpen(true), []);
  const closeSheet = useCallback(() => setIsOpen(false), []);
  const notifyExpenseSaved = useCallback(
    () => setSavedVersion((v) => v + 1),
    [],
  );

  const value = useMemo(
    () => ({
      isOpen,
      openSheet,
      closeSheet,
      savedVersion,
      notifyExpenseSaved,
    }),
    [isOpen, openSheet, closeSheet, savedVersion, notifyExpenseSaved],
  );

  return (
    <ExpenseInputContext.Provider value={value}>
      {children}
      <ExpenseInputSheet isOpen={isOpen} onClose={closeSheet} />
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
