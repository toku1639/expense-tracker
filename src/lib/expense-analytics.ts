import { formatYearMonthLabel, shiftYearMonth } from "@/lib/format";
import {
  isExpenseTransaction,
  type ExpenseDocument,
} from "@/types/expense";

function onlyExpenses(expenses: ExpenseDocument[]): ExpenseDocument[] {
  return expenses.filter(isExpenseTransaction);
}

export type DailyChartPoint = {
  day: number;
  label: string;
  amount: number;
};

export type CategoryChartPoint = {
  category: string;
  amount: number;
};

export type MonthlyChartPoint = {
  yearMonth: string;
  label: string;
  amount: number;
};

/** 指定月の日別支出合計（1日〜月末） */
export function aggregateDailyTotals(
  expenses: ExpenseDocument[],
  yearMonth: string,
): DailyChartPoint[] {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return [];

  const daysInMonth = new Date(y, m, 0).getDate();
  const totals = new Map<number, number>();

  for (let d = 1; d <= daysInMonth; d++) {
    totals.set(d, 0);
  }

  for (const expense of onlyExpenses(expenses)) {
    if (!expense.date.startsWith(yearMonth)) continue;
    const day = Number(expense.date.split("-")[2]);
    if (!day) continue;
    totals.set(day, (totals.get(day) ?? 0) + expense.amount);
  }

  return Array.from(totals.entries()).map(([day, amount]) => ({
    day,
    label: `${day}日`,
    amount,
  }));
}

/** 指定月のカテゴリ別支出合計 */
export function aggregateByCategory(
  expenses: ExpenseDocument[],
  yearMonth: string,
): CategoryChartPoint[] {
  const totals = new Map<string, number>();

  for (const expense of onlyExpenses(expenses)) {
    if (!expense.date.startsWith(yearMonth)) continue;
    const cat = expense.category || "その他";
    totals.set(cat, (totals.get(cat) ?? 0) + expense.amount);
  }

  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** 直近 N か月の月別支出合計 */
export function aggregateMonthlyTotals(
  expenses: ExpenseDocument[],
  monthCount = 12,
): MonthlyChartPoint[] {
  const totals = new Map<string, number>();

  for (const expense of onlyExpenses(expenses)) {
    const ym = expense.date.slice(0, 7);
    if (ym.length !== 7) continue;
    totals.set(ym, (totals.get(ym) ?? 0) + expense.amount);
  }

  const result: MonthlyChartPoint[] = [];
  const now = new Date();

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({
      yearMonth,
      label: formatYearMonthLabel(yearMonth),
      amount: totals.get(yearMonth) ?? 0,
    });
  }

  return result;
}

export function hasAnyExpenseInMonth(
  expenses: ExpenseDocument[],
  yearMonth: string,
): boolean {
  return onlyExpenses(expenses).some(
    (e) => e.date.startsWith(yearMonth) && e.amount > 0,
  );
}

export type MonthSummary = {
  total: number;
  count: number;
  prevMonthTotal: number;
  diffFromPrev: number;
  dailyAverage: number;
  topCategory: { name: string; amount: number } | null;
};

/** 指定月のサマリー（前月比・日平均・トップカテゴリ） */
export function getMonthSummary(
  expenses: ExpenseDocument[],
  yearMonth: string,
): MonthSummary {
  const spending = onlyExpenses(expenses);
  const monthExpenses = spending.filter((e) => e.date.startsWith(yearMonth));
  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const count = monthExpenses.length;

  const prevMonth = shiftYearMonth(yearMonth, -1);
  const prevMonthTotal = spending
    .filter((e) => e.date.startsWith(prevMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const [y, m] = yearMonth.split("-").map(Number);
  const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 30;
  const dailyAverage =
    daysInMonth > 0 ? Math.round(total / daysInMonth) : 0;

  const categories = aggregateByCategory(expenses, yearMonth);
  const topCategory = categories[0]
    ? { name: categories[0].category, amount: categories[0].amount }
    : null;

  return {
    total,
    count,
    prevMonthTotal,
    diffFromPrev: total - prevMonthTotal,
    dailyAverage,
    topCategory,
  };
}

export function hasAnyExpenseData(expenses: ExpenseDocument[]): boolean {
  return onlyExpenses(expenses).some((e) => e.amount > 0);
}

export type CategoryGroup = {
  category: string;
  total: number;
  count: number;
  expenses: ExpenseDocument[];
};

/** カテゴリ別にグループ化（金額の多い順） */
export function groupByCategory(expenses: ExpenseDocument[]): CategoryGroup[] {
  const map = new Map<string, ExpenseDocument[]>();

  for (const expense of onlyExpenses(expenses)) {
    const cat = expense.category || "その他";
    const list = map.get(cat) ?? [];
    list.push(expense);
    map.set(cat, list);
  }

  return Array.from(map.entries())
    .map(([category, items]) => {
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      const total = sorted.reduce((sum, e) => sum + e.amount, 0);
      return { category, total, count: sorted.length, expenses: sorted };
    })
    .sort((a, b) => b.total - a.total);
}

export type CategoryTrendPoint = {
  yearMonth: string;
  label: string;
  amounts: Record<string, number>;
  total: number;
};

/** 直近 N か月のカテゴリ別推移（上位カテゴリを列として持つ） */
export function aggregateCategoryTrends(
  expenses: ExpenseDocument[],
  monthCount = 6,
  topCategoryCount = 5,
): { points: CategoryTrendPoint[]; categories: string[] } {
  const monthly = aggregateMonthlyTotals(expenses, monthCount);
  const categoryTotals = new Map<string, number>();

  const spending = onlyExpenses(expenses);

  for (const expense of spending) {
    const ym = expense.date.slice(0, 7);
    if (!monthly.some((m) => m.yearMonth === ym)) continue;
    const cat = expense.category || "その他";
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + expense.amount);
  }

  const categories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topCategoryCount)
    .map(([name]) => name);

  const points: CategoryTrendPoint[] = monthly.map((month) => {
    const amounts: Record<string, number> = {};
    for (const cat of categories) amounts[cat] = 0;

    for (const expense of spending) {
      if (!expense.date.startsWith(month.yearMonth)) continue;
      const cat = expense.category || "その他";
      if (cat in amounts) {
        amounts[cat] += expense.amount;
      }
    }

    return {
      yearMonth: month.yearMonth,
      label: month.label.replace(/^\d{4}年/, "").replace("月", ""),
      amounts,
      total: month.amount,
    };
  });

  return { points, categories };
}

export type PeriodComparison = {
  currentTotal: number;
  previousTotal: number;
  diff: number;
  /** 前期間が 0 のときは null */
  changePercent: number | null;
};

export function comparePeriods(
  expenses: ExpenseDocument[],
  currentYm: string,
  previousYm: string,
): PeriodComparison {
  const spending = onlyExpenses(expenses);
  const sumFor = (ym: string) =>
    spending
      .filter((e) => e.date.startsWith(ym))
      .reduce((sum, e) => sum + e.amount, 0);

  const currentTotal = sumFor(currentYm);
  const previousTotal = sumFor(previousYm);
  const diff = currentTotal - previousTotal;
  const changePercent =
    previousTotal > 0 ? Math.round((diff / previousTotal) * 1000) / 10 : null;

  return { currentTotal, previousTotal, diff, changePercent };
}

export type FixedVariableSplit = {
  fixedTotal: number;
  variableTotal: number;
  fixedCount: number;
  variableCount: number;
};

/** 固定費（recurringExpenseId あり）と変動費の内訳 */
export function splitFixedAndVariable(
  expenses: ExpenseDocument[],
  yearMonth: string,
): FixedVariableSplit {
  let fixedTotal = 0;
  let variableTotal = 0;
  let fixedCount = 0;
  let variableCount = 0;

  for (const expense of onlyExpenses(expenses)) {
    if (!expense.date.startsWith(yearMonth)) continue;
    if (expense.recurringExpenseId) {
      fixedTotal += expense.amount;
      fixedCount += 1;
    } else {
      variableTotal += expense.amount;
      variableCount += 1;
    }
  }

  return { fixedTotal, variableTotal, fixedCount, variableCount };
}

export type CategoryPeriodChange = {
  category: string;
  current: number;
  previous: number;
  diff: number;
};

/** カテゴリごとの前月比（金額差の大きい順） */
export function getCategoryPeriodChanges(
  expenses: ExpenseDocument[],
  currentYm: string,
  previousYm: string,
): CategoryPeriodChange[] {
  const map = new Map<string, { current: number; previous: number }>();

  for (const expense of onlyExpenses(expenses)) {
    const cat = expense.category || "その他";
    const row = map.get(cat) ?? { current: 0, previous: 0 };
    if (expense.date.startsWith(currentYm)) row.current += expense.amount;
    if (expense.date.startsWith(previousYm)) row.previous += expense.amount;
    map.set(cat, row);
  }

  return Array.from(map.entries())
    .map(([category, { current, previous }]) => ({
      category,
      current,
      previous,
      diff: current - previous,
    }))
    .filter((row) => row.current > 0 || row.previous > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/** 品名の比較用キー（表記ゆれをある程度吸収） */
export function normalizeItemName(name: string): string {
  return name
    .trim()
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export type ItemPriceTrendPoint = {
  yearMonth: string;
  label: string;
  /** その月の平均単価。購入がない月は null */
  average: number | null;
  count: number;
};

export type ItemPriceChange = {
  key: string;
  itemName: string;
  category: string;
  recentAvg: number;
  baselineAvg: number;
  diff: number;
  changePercent: number;
  recentCount: number;
  baselineCount: number;
  totalCount: number;
};

type ItemBucket = {
  displayName: string;
  displayNameCounts: Map<string, number>;
  categoryCounts: Map<string, number>;
  byMonth: Map<string, { sum: number; count: number }>;
  totalCount: number;
};

function buildItemBuckets(expenses: ExpenseDocument[]): Map<string, ItemBucket> {
  const buckets = new Map<string, ItemBucket>();

  for (const expense of onlyExpenses(expenses)) {
    const raw = expense.itemName.trim();
    if (!raw || expense.amount <= 0) continue;

    const key = normalizeItemName(raw);
    if (!key) continue;

    const ym = expense.date.slice(0, 7);
    if (ym.length !== 7) continue;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        displayName: raw,
        displayNameCounts: new Map(),
        categoryCounts: new Map(),
        byMonth: new Map(),
        totalCount: 0,
      };
      buckets.set(key, bucket);
    }

    bucket.displayNameCounts.set(
      raw,
      (bucket.displayNameCounts.get(raw) ?? 0) + 1,
    );
    const cat = expense.category || "その他";
    bucket.categoryCounts.set(cat, (bucket.categoryCounts.get(cat) ?? 0) + 1);

    const month = bucket.byMonth.get(ym) ?? { sum: 0, count: 0 };
    month.sum += expense.amount;
    month.count += 1;
    bucket.byMonth.set(ym, month);
    bucket.totalCount += 1;
  }

  for (const bucket of buckets.values()) {
    let bestName = bucket.displayName;
    let bestNameCount = 0;
    for (const [name, count] of bucket.displayNameCounts) {
      if (count > bestNameCount) {
        bestName = name;
        bestNameCount = count;
      }
    }
    bucket.displayName = bestName;
  }

  return buckets;
}

function mostCommonKey(counts: Map<string, number>, fallback: string): string {
  let best = fallback;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function averageOfMonths(
  byMonth: Map<string, { sum: number; count: number }>,
  yearMonths: string[],
): { avg: number; count: number } | null {
  let sum = 0;
  let count = 0;
  for (const ym of yearMonths) {
    const row = byMonth.get(ym);
    if (!row) continue;
    sum += row.sum;
    count += row.count;
  }
  if (count === 0) return null;
  return { avg: Math.round(sum / count), count };
}

/**
 * 品名ごとの値上がりランキング。
 * 直近2か月の平均単価 vs その前4か月の平均単価を比較する。
 */
export function getItemPriceChanges(
  expenses: ExpenseDocument[],
  options?: {
    recentMonths?: number;
    baselineMonths?: number;
    minTotalCount?: number;
    limit?: number;
  },
): ItemPriceChange[] {
  const recentMonths = options?.recentMonths ?? 2;
  const baselineMonths = options?.baselineMonths ?? 4;
  const minTotalCount = options?.minTotalCount ?? 2;
  const limit = options?.limit ?? 15;

  const buckets = buildItemBuckets(expenses);
  const nowYm = getCurrentYearMonthFromExpenses(expenses);
  const recentYms: string[] = [];
  const baselineYms: string[] = [];

  for (let i = 0; i < recentMonths; i++) {
    recentYms.push(shiftYearMonth(nowYm, -i));
  }
  for (let i = 0; i < baselineMonths; i++) {
    baselineYms.push(shiftYearMonth(nowYm, -(recentMonths + i)));
  }

  const results: ItemPriceChange[] = [];

  for (const [key, bucket] of buckets) {
    if (bucket.totalCount < minTotalCount) continue;

    const recent = averageOfMonths(bucket.byMonth, recentYms);
    const baseline = averageOfMonths(bucket.byMonth, baselineYms);
    if (!recent || !baseline) continue;
    if (baseline.avg <= 0) continue;

    const diff = recent.avg - baseline.avg;
    const changePercent = Math.round((diff / baseline.avg) * 1000) / 10;

    results.push({
      key,
      itemName: bucket.displayName,
      category: mostCommonKey(bucket.categoryCounts, "その他"),
      recentAvg: recent.avg,
      baselineAvg: baseline.avg,
      diff,
      changePercent,
      recentCount: recent.count,
      baselineCount: baseline.count,
      totalCount: bucket.totalCount,
    });
  }

  return results
    .sort((a, b) => {
      if (b.changePercent !== a.changePercent) {
        return b.changePercent - a.changePercent;
      }
      return b.diff - a.diff;
    })
    .slice(0, limit);
}

/** 指定品名の月別平均単価推移（直近 N か月） */
export function getItemPriceTrend(
  expenses: ExpenseDocument[],
  itemKey: string,
  monthCount = 6,
): ItemPriceTrendPoint[] {
  const buckets = buildItemBuckets(expenses);
  const bucket = buckets.get(itemKey);
  const nowYm = getCurrentYearMonthFromExpenses(expenses);
  const points: ItemPriceTrendPoint[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const yearMonth = shiftYearMonth(nowYm, -i);
    const row = bucket?.byMonth.get(yearMonth);
    points.push({
      yearMonth,
      label: formatYearMonthLabel(yearMonth)
        .replace(/^\d{4}年/, "")
        .replace("月", ""),
      average: row ? Math.round(row.sum / row.count) : null,
      count: row?.count ?? 0,
    });
  }

  return points;
}

/** 推移グラフ用に選べる品名一覧（出現回数の多い順） */
export function listComparableItems(
  expenses: ExpenseDocument[],
  minTotalCount = 2,
): { key: string; itemName: string; totalCount: number }[] {
  const buckets = buildItemBuckets(expenses);
  return Array.from(buckets.entries())
    .filter(([, b]) => b.totalCount >= minTotalCount)
    .map(([key, b]) => ({
      key,
      itemName: b.displayName,
      totalCount: b.totalCount,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

function getCurrentYearMonthFromExpenses(expenses: ExpenseDocument[]): string {
  let latest = "";
  for (const expense of expenses) {
    const ym = expense.date.slice(0, 7);
    if (ym.length === 7 && ym > latest) latest = ym;
  }
  if (latest) return latest;

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
