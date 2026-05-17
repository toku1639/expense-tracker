import { ExpenseHistoryList } from "@/components/expense/expense-history-list";

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">履歴</h1>
        <p className="mt-2 text-sm text-slate-600">
          月ごとの明細をテーブルで確認（項目別・日付の古い順）
        </p>
      </header>

      <ExpenseHistoryList />
    </div>
  );
}
