import type { ExpenseCategory, TransactionType } from "@/types/expense";

/** Firestore `recurringExpenses` コレクションの固定収支テンプレート */
export type RecurringExpense = {
  /** 品名 */
  itemName: string;
  /** 金額（円） */
  amount: number;
  /** カテゴリ */
  category: string;
  /** 毎月の何日に計上するか（1〜31。月末を超える月は末日に寄せる） */
  dayOfMonth: number;
  /** 開始年月（YYYY-MM）。この月以降に自動追加 */
  startYearMonth: string;
  /** false なら自動追加しない */
  active: boolean;
  /** 支出 or 収入。未設定は支出 */
  type?: TransactionType;
};

export type RecurringExpenseDocument = RecurringExpense & {
  id: string;
  createdAt: Date;
};

export type RecurringExpenseInput = RecurringExpense;

export type RecurringExpenseFormValues = {
  itemName: string;
  amount: number;
  category: ExpenseCategory | string;
  dayOfMonth: number;
  startYearMonth: string;
  active: boolean;
  type: TransactionType;
};
