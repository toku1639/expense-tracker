import { ReportDashboard } from "@/components/expense/report-dashboard";

export default function ReportPage() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <header className="pt-1 text-center">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          レポート
        </h1>
      </header>
      <ReportDashboard />
    </div>
  );
}
