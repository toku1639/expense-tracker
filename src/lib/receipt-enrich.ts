import type { ExpenseSuggestion } from "@/lib/expense-suggestions";
import type { ReceiptScanResult } from "@/lib/receipt-scan";

/** 過去の品名履歴で、レシート明細のカテゴリを補正する */
export function enrichReceiptItemsWithHistory(
  items: ReceiptScanResult[],
  suggestions: ExpenseSuggestion[],
): ReceiptScanResult[] {
  if (suggestions.length === 0) return items;

  const byName = new Map(
    suggestions.map((s) => [s.itemName.trim().toLowerCase(), s]),
  );

  return items.map((item) => {
    const key = item.itemName.trim().toLowerCase();
    const hit = byName.get(key);
    if (!hit) return item;

    // 完全一致の履歴があればカテゴリを優先（金額はレシート実額を維持）
    return {
      ...item,
      category: hit.category || item.category,
    };
  });
}

const LAST_STORE_KEY = "expense-tracker:last-receipt-store";
const LAST_PAYMENT_KEY = "expense-tracker:last-payment-method";

export function rememberLastStoreName(storeName?: string): void {
  if (typeof window === "undefined") return;
  const name = storeName?.trim();
  if (!name) return;
  window.localStorage.setItem(LAST_STORE_KEY, name);
}

export function getLastStoreName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_STORE_KEY);
}

export function rememberLastPaymentMethod(method: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_PAYMENT_KEY, method);
}

export function getLastPaymentMethod(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_PAYMENT_KEY);
}
