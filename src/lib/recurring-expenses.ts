import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { createExpense, getExpenses } from "@/lib/expenses";
import { getDb } from "@/lib/firebase";
import { getCurrentYearMonth, shiftYearMonth } from "@/lib/format";
import type {
  RecurringExpenseDocument,
  RecurringExpenseInput,
} from "@/types/recurring-expense";
import { getTransactionType, type TransactionType } from "@/types/expense";

export const RECURRING_EXPENSES_COLLECTION = "recurringExpenses";

function recurringRef() {
  return collection(getDb(), RECURRING_EXPENSES_COLLECTION);
}

function toRecurringDocument(
  id: string,
  data: DocumentData,
): RecurringExpenseDocument {
  const createdAt =
    data.createdAt?.toDate?.() instanceof Date
      ? data.createdAt.toDate()
      : new Date();

  const type: TransactionType | undefined =
    data.type === "income" || data.type === "expense" ? data.type : undefined;

  return {
    id,
    itemName: String(data.itemName ?? ""),
    amount: Number(data.amount ?? 0),
    category: String(data.category ?? ""),
    dayOfMonth: Math.min(31, Math.max(1, Number(data.dayOfMonth ?? 1))),
    startYearMonth: String(data.startYearMonth ?? getCurrentYearMonth()),
    active: data.active !== false,
    createdAt,
    ...(type ? { type } : {}),
  };
}

/** 固定収支テンプレート一覧 */
export async function getRecurringExpenses(): Promise<
  RecurringExpenseDocument[]
> {
  const snap = await getDocs(
    query(recurringRef(), orderBy("dayOfMonth", "asc")),
  );
  return snap.docs.map((d) => toRecurringDocument(d.id, d.data()));
}

/** 固定収支テンプレートを追加 */
export async function createRecurringExpense(
  input: RecurringExpenseInput,
): Promise<string> {
  const type = getTransactionType(input);
  const ref = await addDoc(recurringRef(), {
    itemName: input.itemName.trim(),
    amount: input.amount,
    category: input.category.trim(),
    dayOfMonth: clampDay(input.dayOfMonth),
    startYearMonth: input.startYearMonth,
    active: input.active,
    type,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** 固定収支テンプレートを更新 */
export async function updateRecurringExpense(
  id: string,
  input: Partial<RecurringExpenseInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (input.itemName !== undefined) payload.itemName = input.itemName.trim();
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.category !== undefined) payload.category = input.category.trim();
  if (input.dayOfMonth !== undefined) {
    payload.dayOfMonth = clampDay(input.dayOfMonth);
  }
  if (input.startYearMonth !== undefined) {
    payload.startYearMonth = input.startYearMonth;
  }
  if (input.active !== undefined) payload.active = input.active;
  if (input.type !== undefined) payload.type = input.type;

  await updateDoc(doc(getDb(), RECURRING_EXPENSES_COLLECTION, id), payload);
}

/** 固定収支テンプレートを削除 */
export async function deleteRecurringExpense(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), RECURRING_EXPENSES_COLLECTION, id));
}

function clampDay(day: number): number {
  return Math.min(31, Math.max(1, Math.round(day) || 1));
}

/** 指定年月の実日付（dayOfMonth が月末を超える場合は末日） */
export function resolveRecurringDate(
  yearMonth: string,
  dayOfMonth: number,
): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return `${yearMonth}-01`;

  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(clampDay(dayOfMonth), lastDay);
  return `${yearMonth}-${String(day).padStart(2, "0")}`;
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yearMonthsFromTo(start: string, end: string): string[] {
  if (start > end) return [];
  const months: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    months.push(cursor);
    cursor = shiftYearMonth(cursor, 1);
  }
  return months;
}

export type ApplyRecurringResult = {
  createdCount: number;
  createdIds: string[];
};

/**
 * 到来済みの固定収支を自動追加する。
 * 同じ recurringExpenseId + 年月の取引が既にあればスキップ。
 */
export async function applyDueRecurringExpenses(): Promise<ApplyRecurringResult> {
  const [templates, expenses] = await Promise.all([
    getRecurringExpenses(),
    getExpenses(),
  ]);

  const active = templates.filter((t) => t.active);
  if (active.length === 0) {
    return { createdCount: 0, createdIds: [] };
  }

  const today = todayDateString();
  const currentYm = getCurrentYearMonth();
  const existingKeys = new Set(
    expenses
      .filter((e) => e.recurringExpenseId)
      .map((e) => `${e.recurringExpenseId}:${e.date.slice(0, 7)}`),
  );

  const createdIds: string[] = [];

  for (const template of active) {
    const months = yearMonthsFromTo(template.startYearMonth, currentYm);
    const type = getTransactionType(template);

    for (const yearMonth of months) {
      const date = resolveRecurringDate(yearMonth, template.dayOfMonth);
      if (date > today) continue;

      const key = `${template.id}:${yearMonth}`;
      if (existingKeys.has(key)) continue;

      const id = await createExpense({
        itemName: template.itemName,
        amount: template.amount,
        category: template.category,
        date,
        type,
        paymentMethod: type === "expense" ? "cash" : undefined,
        recurringExpenseId: template.id,
      });

      existingKeys.add(key);
      createdIds.push(id);
    }
  }

  return { createdCount: createdIds.length, createdIds };
}
