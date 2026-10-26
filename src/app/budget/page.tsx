import { BudgetDashboard } from "@/components/expense/budget-dashboard";

export default function BudgetPage() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <header className="pt-1 text-center">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">予算</h1>
      </header>
      <BudgetDashboard />
    </div>
  );
}
