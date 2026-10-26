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
import {
  getTransactionType,
  isExpenseTransaction,
  normalizePaymentMethod,
  type ExpenseDocument,
  type ExpenseInput,
  type TransactionType,
} from "@/types/expense";

export const EXPENSES_COLLECTION = "expenses";

function expensesRef() {
  return collection(getDb(), EXPENSES_COLLECTION);
}

function toExpenseDocument(id: string, data: DocumentData): ExpenseDocument {
  const createdAt =
    data.createdAt?.toDate?.() instanceof Date
      ? data.createdAt.toDate()
      : new Date();

  const recurringExpenseId =
    typeof data.recurringExpenseId === "string" && data.recurringExpenseId
      ? data.recurringExpenseId
      : undefined;

  const type: TransactionType | undefined =
    data.type === "income" || data.type === "expense" ? data.type : undefined;

  const paymentMethod = normalizePaymentMethod(data.paymentMethod);

  return {
    id,
    itemName: String(data.itemName ?? ""),
    amount: Number(data.amount ?? 0),
    category: String(data.category ?? ""),
    date: String(data.date ?? ""),
    createdAt,
    ...(type ? { type } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(recurringExpenseId ? { recurringExpenseId } : {}),
  };
}

/** 取引を1件追加 */
export async function createExpense(input: ExpenseInput): Promise<string> {
  const type = getTransactionType(input);
  const payload: Record<string, unknown> = {
    itemName: input.itemName.trim(),
    amount: input.amount,
    category: input.category.trim(),
    date: input.date,
    type,
    createdAt: serverTimestamp(),
  };

  if (type === "expense") {
    payload.paymentMethod = input.paymentMethod ?? "cash";
  }

  if (input.recurringExpenseId) {
    payload.recurringExpenseId = input.recurringExpenseId;
  }

  const ref = await addDoc(expensesRef(), payload);
  return ref.id;
}

/** 取引をIDで1件取得 */
export async function getExpenseById(
  id: string,
): Promise<ExpenseDocument | null> {
  const snap = await getDoc(doc(getDb(), EXPENSES_COLLECTION, id));
  if (!snap.exists()) return null;
  return toExpenseDocument(snap.id, snap.data());
}

/** 取引一覧を取得（日付の新しい順） */
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

/** 取引を更新 */
export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (input.itemName !== undefined) payload.itemName = input.itemName.trim();
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.category !== undefined) payload.category = input.category.trim();
  if (input.date !== undefined) payload.date = input.date;
  if (input.type !== undefined) payload.type = input.type;
  if (input.paymentMethod !== undefined) {
    payload.paymentMethod = input.paymentMethod;
  }

  await updateDoc(doc(getDb(), EXPENSES_COLLECTION, id), payload);
}

/** 取引を削除 */
export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), EXPENSES_COLLECTION, id));
}

/** 今月の総支出を計算（収入は含めない） */
export function getMonthlyTotal(
  expenses: ExpenseDocument[],
  yearMonth?: string,
): number {
  const target = yearMonth ?? getCurrentYearMonth();

  return expenses
    .filter((e) => e.date.startsWith(target) && isExpenseTransaction(e))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getMonthlyIncomeTotal(
  expenses: ExpenseDocument[],
  yearMonth?: string,
): number {
  const target = yearMonth ?? getCurrentYearMonth();

  return expenses
    .filter((e) => e.date.startsWith(target) && e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
}
