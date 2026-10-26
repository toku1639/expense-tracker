/** ローカルタイムゾーンの YYYY-MM */
export function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  if (!y || !m) return yearMonth;
  return `${y}年${Number(m)}月`;
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${y}/${Number(m)}/${Number(d)}`;
}

export function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/** 月を加算（delta: -1 で前月、+1 で翌月） */
export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function compareYearMonth(a: string, b: string): number {
  return a.localeCompare(b);
}

/** 日付ヘッダー用（例: 5月17日（土）） */
export function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${m}月${d}日（${weekday}）`;
}

/** 入力画面用（例: 2026年10月26日(月)） */
export function formatFullDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${y}年${m}月${d}日(${weekday})`;
}

/** YYYY-MM-DD を日数ぶんずらす */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) + deltaDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** ローカル今日の YYYY-MM-DD */
export function getLocalTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 月の日数範囲ラベル（例: 10月1日－10月31日） */
export function formatMonthRangeLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  const last = new Date(y, m, 0).getDate();
  return `${m}月1日－${m}月${last}日`;
}
