import { TransactionSearch } from "@/components/expense/transaction-search";

export default function SearchPage() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <header className="pt-1 text-center">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          取引検索
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          品名・カテゴリ・支払方法で過去の取引を探せます
        </p>
      </header>
      <TransactionSearch />
    </div>
  );
}
