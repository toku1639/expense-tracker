"use client";

import {
  CalendarDays,
  ChartPie,
  Ellipsis,
  Pencil,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/input", label: "入力", icon: Pencil, match: (p: string) => p === "/input" || p.startsWith("/input/") },
  {
    href: "/calendar",
    label: "カレンダー",
    icon: CalendarDays,
    match: (p: string) => p === "/calendar" || p.startsWith("/calendar/"),
  },
  {
    href: "/report",
    label: "レポート",
    icon: ChartPie,
    match: (p: string) => p === "/report" || p.startsWith("/report/"),
  },
  {
    href: "/budget",
    label: "予算",
    icon: Wallet,
    match: (p: string) => p === "/budget" || p.startsWith("/budget/"),
  },
  {
    href: "/menu",
    label: "メニュー",
    icon: Ellipsis,
    match: (p: string) => p === "/menu" || p.startsWith("/menu/"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-50 px-3"
      aria-label="メインナビゲーション"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between rounded-full border border-slate-200 bg-white/95 px-1 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-[10px] font-medium transition ${
                active
                  ? "bg-slate-100 text-teal-700"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
