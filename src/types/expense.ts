/** Firestore `expenses` コレクションの支出データ */
export type Expense = {
  /** 品名 */
  itemName: string;
  /** 金額（円） */
  amount: number;
  /** カテゴリ */
  category: string;
  /** 支出日（YYYY-MM-DD） */
  date: string;
};

export type ExpenseDocument = Expense & {
  id: string;
  createdAt: Date;
};

export type ExpenseInput = Expense;

export const EXPENSE_CATEGORIES = [
  "食費",
  "日用品",
  "交通",
  "娯楽",
  "医療",
  "衣服",
  "住居",
  "その他",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
