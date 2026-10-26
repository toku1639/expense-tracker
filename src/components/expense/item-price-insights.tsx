"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getItemPriceChanges,
  getItemPriceTrend,
  listComparableItems,
} from "@/lib/expense-analytics";
import { formatAmount } from "@/lib/format";
import type { ExpenseDocument } from "@/types/expense";

type ItemPriceInsightsProps = {
  expenses: ExpenseDocument[];
};

function ChangeBadge({
  diff,
  percent,
}: {
  diff: number;
  percent: number;
}) {
  if (diff === 0) {
    return <span className="text-xs font-medium text-slate-500">変化なし</span>;
  }

  const up = diff > 0;
  return (
    <span
      className={`text-xs font-semibold tabular-nums ${
        up ? "text-rose-600" : "text-emerald-600"
      }`}
    >
      {up ? "+" : ""}
      {formatAmount(diff)}
      <span className="ml-1 font-medium">
       （{up ? "+" : ""}
        {percent}%）
      </span>
    </span>
  );
}

export function ItemPriceInsights({ expenses }: ItemPriceInsightsProps) {
  const priceChanges = useMemo(
    () => getItemPriceChanges(expenses, { limit: 10 }),
    [expenses],
  );

  const comparableItems = useMemo(
    () => listComparableItems(expenses, 2),
    [expenses],
  );

  const [selectedKey, setSelectedKey] = useState<string>("");

  const activeKey = selectedKey || comparableItems[0]?.key || "";

  const trend = useMemo(
    () => (activeKey ? getItemPriceTrend(expenses, activeKey, 6) : []),
    [expenses, activeKey],
  );

  const chartData = useMemo(
    () =>
      trend.map((point) => ({
        label: point.label,
        average: point.average,
        count: point.count,
      })),
    [trend],
  );

  const selectedName =
    comparableItems.find((item) => item.key === activeKey)?.itemName ??
    priceChanges.find((item) => item.key === activeKey)?.itemName ??
    "";

  const hasComparable = comparableItems.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          品名の値上がりランキング
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          直近2か月の平均単価を、その前4か月と比較（同じ品名同士）
        </p>

        {!hasComparable || priceChanges.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            同じ品名が複数月にわたって記録されると、値上がりが見えるようになります
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {priceChanges.map((row, index) => (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => setSelectedKey(row.key)}
                  className={`flex w-full items-start gap-3 py-2.5 text-left transition ${
                    activeKey === row.key ? "bg-teal-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold text-slate-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {row.itemName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {row.category} · 以前 {formatAmount(row.baselineAvg)} →
                      最近 {formatAmount(row.recentAvg)}
                    </p>
                  </div>
                  <ChangeBadge diff={row.diff} percent={row.changePercent} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          品名の価格推移
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          月ごとの平均単価（タップで品名を切り替え）
        </p>

        {!hasComparable ? (
          <p className="mt-4 text-sm text-slate-400">
            比較できる品名がまだありません
          </p>
        ) : (
          <>
            <label className="mt-3 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">品名</span>
              <select
                value={activeKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {comparableItems.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.itemName}（{item.totalCount}件）
                  </option>
                ))}
              </select>
            </label>

            <p className="mt-2 text-xs text-slate-500">
              {selectedName} の直近6か月
            </p>

            <div className="mt-2 h-56">
              {chartData.every((d) => d.average == null) ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  この期間の記録がありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={(v) =>
                        v >= 10000 ? `${v / 10000}万` : String(v)
                      }
                      width={40}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const count = Number(
                          (item?.payload as { count?: number } | undefined)
                            ?.count ?? 0,
                        );
                        if (value == null) return ["記録なし", "平均単価"];
                        return [
                          `${formatAmount(Number(value))}（${count}件）`,
                          "平均単価",
                        ];
                      }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#0d9488" }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
