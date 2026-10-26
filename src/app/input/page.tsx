import { TransactionInputForm } from "@/components/expense/transaction-input-form";

export default function InputPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="pt-1 text-center">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">入力</h1>
      </header>
      <TransactionInputForm />
    </div>
  );
}
