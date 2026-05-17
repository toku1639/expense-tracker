"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  compareYearMonth,
  formatYearMonthLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from "@/lib/format";

type MonthSelectorProps = {
  value: string;
  onChange: (yearMonth: string) => void;
};

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const currentMonth = getCurrentYearMonth();
  const canGoNext = compareYearMonth(value, currentMonth) < 0;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(shiftYearMonth(value, -1))}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"
        aria-label="前の月"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="text-center">
        <p className="text-base font-semibold text-slate-900">
          {formatYearMonthLabel(value)}
        </p>
        {value === currentMonth && (
          <p className="text-xs text-teal-600">今月</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftYearMonth(value, 1))}
        disabled={!canGoNext}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="次の月"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
