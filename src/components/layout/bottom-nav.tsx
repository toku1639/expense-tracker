"use client";

import { History, Home, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseInput } from "@/contexts/expense-input-context";

export function BottomNav() {
  const pathname = usePathname();
  const { openSheet } = useExpenseInput();
  const homeActive = pathname === "/";
  const historyActive = pathname === "/history";

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      aria-label="メインナビゲーション"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pt-2">
        <NavLink href="/" label="ホーム" active={homeActive}>
          <Home className="h-6 w-6" strokeWidth={homeActive ? 2.5 : 2} />
        </NavLink>

        <button
          type="button"
          className="flex -mt-5 flex-col items-center gap-1 rounded-full bg-teal-600 px-5 py-3 text-white shadow-lg shadow-teal-600/30 transition active:scale-95"
          aria-label="支出を入力"
          onClick={openSheet}
        >
          <PlusCircle className="h-7 w-7" strokeWidth={2.5} />
          <span className="text-xs font-semibold">入力</span>
        </button>

        <NavLink href="/history" label="履歴" active={historyActive}>
          <History className="h-6 w-6" strokeWidth={historyActive ? 2.5 : 2} />
        </NavLink>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-[4.5rem] flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
        active ? "text-teal-700" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
