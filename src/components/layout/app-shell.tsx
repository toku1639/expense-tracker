"use client";

import { BottomNav } from "./bottom-nav";
import { RecurringAutoApply } from "./recurring-auto-apply";
import { ExpenseInputProvider } from "@/contexts/expense-input-context";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <ExpenseInputProvider>
      <div className="flex min-h-dvh flex-col bg-white text-slate-900">
        <RecurringAutoApply />
        <main className="pt-safe mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-28">
          {children}
        </main>
        <BottomNav />
      </div>
    </ExpenseInputProvider>
  );
}
