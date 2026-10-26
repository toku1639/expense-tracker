import {
  collection,
  doc,
  getDocs,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export const BUDGETS_COLLECTION = "budgets";

export type BudgetDocument = {
  /** ドキュメント ID は `${yearMonth}_${category}` */
  id: string;
  yearMonth: string;
  category: string;
  amount: number;
};

function budgetsRef() {
  return collection(getDb(), BUDGETS_COLLECTION);
}

function toBudget(id: string, data: DocumentData): BudgetDocument {
  return {
    id,
    yearMonth: String(data.yearMonth ?? ""),
    category: String(data.category ?? ""),
    amount: Number(data.amount ?? 0),
  };
}

export function budgetDocId(yearMonth: string, category: string): string {
  return `${yearMonth}_${category}`;
}

/** 指定月の予算一覧 */
export async function getBudgetsForMonth(
  yearMonth: string,
): Promise<BudgetDocument[]> {
  const snap = await getDocs(budgetsRef());
  return snap.docs
    .map((d) => toBudget(d.id, d.data()))
    .filter((b) => b.yearMonth === yearMonth && b.amount > 0);
}

/** カテゴリ予算を保存（0 以下は 0 で上書き） */
export async function setCategoryBudget(
  yearMonth: string,
  category: string,
  amount: number,
): Promise<void> {
  const id = budgetDocId(yearMonth, category);
  await setDoc(doc(getDb(), BUDGETS_COLLECTION, id), {
    yearMonth,
    category,
    amount: Math.max(0, Math.round(amount)),
  });
}
