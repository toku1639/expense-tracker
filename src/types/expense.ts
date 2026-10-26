/** 取引種別（未設定の既存データは支出として扱う） */
export type TransactionType = "expense" | "income";

/** 支払方法（支出向け。既存データに無い場合は cash 扱い） */
export const PAYMENT_METHODS = [
  { id: "cash", label: "現金" },
  { id: "card", label: "カード" },
  { id: "paypay", label: "PayPay" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

export function getPaymentMethodLabel(method?: PaymentMethod | string): string {
  const found = PAYMENT_METHODS.find((m) => m.id === method);
  return found?.label ?? "現金";
}

export function normalizePaymentMethod(
  value: unknown,
): PaymentMethod | undefined {
  if (value === "cash" || value === "card" || value === "paypay") return value;
  return undefined;
}

/** Firestore `expenses` コレクションの取引データ */
export type Expense = {
  /** 品名 */
  itemName: string;
  /** 金額（円） */
  amount: number;
  /** カテゴリ */
  category: string;
  /** 支出日（YYYY-MM-DD） */
  date: string;
  /** 支出 or 収入。既存データに無い場合は expense */
  type?: TransactionType;
  /** 支払方法（主に支出） */
  paymentMethod?: PaymentMethod;
  /** 固定費テンプレートから自動追加された場合の参照 ID */
  recurringExpenseId?: string;
};

export type ExpenseDocument = Expense & {
  id: string;
  createdAt: Date;
};

export type ExpenseInput = Expense;

/** MoneyNote 寄せの支出カテゴリ（既存データの移管はしない） */
export const EXPENSE_CATEGORIES = [
  "食費",
  "日用品",
  "衣服",
  "美容",
  "交際費",
  "医療費",
  "教育費",
  "光熱費",
  "交通費",
  "通信費",
  "住居費",
  "その他",
] as const;

export const INCOME_CATEGORIES = [
  "給料",
  "おこづかい",
  "賞与",
  "副業",
  "投資",
  "臨時収入",
  "その他",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export function getTransactionType(
  expense: Pick<Expense, "type">,
): TransactionType {
  return expense.type === "income" ? "income" : "expense";
}

export function isExpenseTransaction(
  expense: Pick<Expense, "type">,
): boolean {
  return getTransactionType(expense) === "expense";
}

export function isIncomeTransaction(
  expense: Pick<Expense, "type">,
): boolean {
  return getTransactionType(expense) === "income";
}
