"use client";

import Link from "next/link";
import {
  ChevronRight,
  Cloud,
  Download,
  HelpCircle,
  Info,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { RecurringExpensePanel } from "@/components/expense/recurring-expense-panel";
import { useExpenseInput } from "@/contexts/expense-input-context";
import { downloadExpensesCsv } from "@/lib/export-csv";
import { getExpenses } from "@/lib/expenses";
import { applyDueRecurringExpenses } from "@/lib/recurring-expenses";

function MenuRow({
  href,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {description && (
          <span className="block text-[11px] text-slate-400">{description}</span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-50"
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center gap-3 px-4 py-3">{content}</div>;
}

export function MenuDashboard() {
  const { notifyExpenseSaved } = useExpenseInput();
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#recurring") return;
    window.requestAnimationFrame(() => {
      document.getElementById("recurring")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      const rows = await getExpenses();
      downloadExpensesCsv(rows);
      setExportMessage(`${rows.length} 件を CSV 出力しました`);
    } catch {
      setExportMessage("CSV の出力に失敗しました");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <MenuRow
          icon={Settings}
          label="全般設定"
          description="今後、開始曜日や表示設定を追加予定"
        />
      </section>

      <RecurringExpensePanel
        onChanged={async () => {
          const applied = await applyDueRecurringExpenses();
          if (applied.createdCount > 0) notifyExpenseSaved();
        }}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">探す・出力</h2>
        </div>
        <MenuRow
          href="/search/"
          icon={Search}
          label="取引検索"
          description="品名・カテゴリ・支払方法で検索"
        />
        <MenuRow
          icon={Download}
          label={exporting ? "CSV 出力中…" : "CSV 出力"}
          description="Excel で開ける形式でダウンロード"
          onClick={handleExportCsv}
        />
        {exportMessage && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-teal-700">
            {exportMessage}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">データ・同期</h2>
        </div>
        <MenuRow
          icon={Cloud}
          label="クラウド同期"
          description="Firebase に自動保存されています"
        />
        <MenuRow
          icon={RefreshCw}
          label="固定収支の自動追加"
          description="アプリ起動時に到来分を反映"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">詳細レポート</h2>
        </div>
        <MenuRow
          href="/report/"
          icon={TrendingUp}
          label="月間・年間レポート"
          description="収支とカテゴリ内訳、値上がり分析"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <MenuRow
          icon={HelpCircle}
          label="使い方"
          description="下部タブから入力・カレンダー・レポート・予算"
        />
        <MenuRow
          icon={Info}
          label="アプリ情報"
          description="家計簿 · Firebase Hosting PWA"
        />
      </section>
    </div>
  );
}
