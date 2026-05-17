import { BottomNav } from "./bottom-nav";
import { ExpenseInputProvider } from "@/contexts/expense-input-context";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <ExpenseInputProvider>
      <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
        <main className="pt-safe mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </ExpenseInputProvider>
  );
}
