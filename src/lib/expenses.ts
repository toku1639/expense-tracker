import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { getCurrentYearMonth } from "@/lib/format";
import { getDb } from "@/lib/firebase";
import type { Expense, ExpenseDocument, ExpenseInput } from "@/types/expense";

export const EXPENSES_COLLECTION = "expenses";

function expensesRef() {
  return collection(getDb(), EXPENSES_COLLECTION);
}

function toExpenseDocument(id: string, data: DocumentData): ExpenseDocument {
  const createdAt =
    data.createdAt?.toDate?.() instanceof Date
      ? data.createdAt.toDate()
      : new Date();

  return {
    id,
    itemName: String(data.itemName ?? ""),
    amount: Number(data.amount ?? 0),
    category: String(data.category ?? ""),
    date: String(data.date ?? ""),
    createdAt,
  };
}

/** 支出を1件追加 */
export async function createExpense(input: ExpenseInput): Promise<string> {
  const ref = await addDoc(expensesRef(), {
    itemName: input.itemName.trim(),
    amount: input.amount,
    category: input.category.trim(),
    date: input.date,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** 支出をIDで1件取得 */
export async function getExpenseById(
  id: string,
): Promise<ExpenseDocument | null> {
  const snap = await getDoc(doc(getDb(), EXPENSES_COLLECTION, id));
  if (!snap.exists()) return null;
  return toExpenseDocument(snap.id, snap.data());
}

/** 支出一覧を取得（日付の新しい順） */
export async function getExpenses(options?: {
  max?: number;
}): Promise<ExpenseDocument[]> {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];

  if (options?.max) {
    constraints.push(limit(options.max));
  }

  const snap = await getDocs(query(expensesRef(), ...constraints));
  return snap.docs.map((d) => toExpenseDocument(d.id, d.data()));
}

/** 支出を更新 */
export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (input.itemName !== undefined) payload.itemName = input.itemName.trim();
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.category !== undefined) payload.category = input.category.trim();
  if (input.date !== undefined) payload.date = input.date;

  await updateDoc(doc(getDb(), EXPENSES_COLLECTION, id), payload);
}

/** 支出を削除 */
export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), EXPENSES_COLLECTION, id));
}

/** 今月の総支出を計算（yearMonth は YYYY-MM、省略時はローカルの今月） */
export function getMonthlyTotal(
  expenses: ExpenseDocument[],
  yearMonth?: string,
): number {
  const target = yearMonth ?? getCurrentYearMonth();

  return expenses
    .filter((e) => e.date.startsWith(target))
    .reduce((sum, e) => sum + e.amount, 0);
}
