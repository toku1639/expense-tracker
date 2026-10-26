import {
  getPaymentMethodLabel,
  getTransactionType,
  type ExpenseDocument,
} from "@/types/expense";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** 取引一覧を CSV 文字列に変換 */
export function expensesToCsv(expenses: ExpenseDocument[]): string {
  const header = [
    "日付",
    "種別",
    "品名",
    "カテゴリ",
    "金額",
    "支払方法",
  ].join(",");

  const rows = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const type = getTransactionType(e);
      return [
        e.date,
        type === "income" ? "収入" : "支出",
        escapeCsv(e.itemName),
        escapeCsv(e.category),
        String(e.amount),
        type === "income" ? "" : getPaymentMethodLabel(e.paymentMethod),
      ].join(",");
    });

  return `\uFEFF${[header, ...rows].join("\n")}`;
}

/** ブラウザで CSV をダウンロード */
export function downloadExpensesCsv(
  expenses: ExpenseDocument[],
  filename = `kakeibo-${new Date().toISOString().slice(0, 10)}.csv`,
): void {
  const csv = expensesToCsv(expenses);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
