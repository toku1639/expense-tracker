"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAmount } from "@/lib/format";
import type {
  CategoryChartPoint,
  DailyChartPoint,
  MonthlyChartPoint,
} from "@/lib/expense-analytics";

type ChartTab = "daily" | "category" | "monthly";

const TABS: { id: ChartTab; label: string }[] = [
  { id: "daily", label: "日別" },
  { id: "category", label: "項目" },
  { id: "monthly", label: "月別" },
];

function YenTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      {label && <p className="mb-1 text-slate-500">{label}</p>}
      <p className="font-semibold text-slate-900">
        {formatAmount(payload[0].value)}
      </p>
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoryChartPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500">{row.category}</p>
      <p className="font-semibold text-slate-900">{formatAmount(row.amount)}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center">
      <p className="text-center text-sm text-slate-400">{message}</p>
    </div>
  );
}

function DailyChart({ data }: { data: DailyChartPoint[] }) {
  const isEmpty = data.every((d) => d.amount === 0);
  if (isEmpty) {
    return <EmptyChart message="この月の支出がありません" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : String(v))}
          width={40}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<YenTooltip />} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#0f766e"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: "#0f766e" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CategoryBarChart({ data }: { data: CategoryChartPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart message="この月の支出がありません" />;
  }

  const chartData = [...data].sort((a, b) => a.amount - b.amount);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : String(v))}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={72}
          tick={{ fontSize: 11, fill: "#475569" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CategoryTooltip />} cursor={{ fill: "#f0fdfa" }} />
        <Bar dataKey="amount" fill="#14b8a6" radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MonthlyChart({ data }: { data: MonthlyChartPoint[] }) {
  const isEmpty = data.every((d) => d.amount === 0);
  if (isEmpty) {
    return <EmptyChart message="まだ支出データがありません" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "#94a3b8" }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : String(v))}
          width={40}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<YenTooltip />} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#0d9488"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#0d9488" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

type DashboardChartPanelProps = {
  monthLabel: string;
  dailyData: DailyChartPoint[];
  categoryData: CategoryChartPoint[];
  monthlyData: MonthlyChartPoint[];
};

export function DashboardChartPanel({
  monthLabel,
  dailyData,
  categoryData,
  monthlyData,
}: DashboardChartPanelProps) {
  const [tab, setTab] = useState<ChartTab>("daily");

  const categoryHeight = Math.max(220, Math.min(320, categoryData.length * 40 + 40));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 pb-3 pt-4">
        <h2 className="text-sm font-semibold text-slate-900">支出の推移</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {tab === "monthly" ? "直近12か月" : monthLabel}
        </p>
      </div>

      <div className="flex gap-1 p-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              tab === id
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="px-2 pb-4 pt-1"
        style={{ height: tab === "category" ? categoryHeight : 260 }}
      >
        {tab === "daily" && <DailyChart data={dailyData} />}
        {tab === "category" && <CategoryBarChart data={categoryData} />}
        {tab === "monthly" && <MonthlyChart data={monthlyData} />}
      </div>
    </section>
  );
}
