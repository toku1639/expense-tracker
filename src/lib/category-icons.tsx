import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Bus,
  CircleEllipsis,
  CircleHelp,
  Coins,
  Droplets,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  Home,
  Package,
  Pill,
  PiggyBank,
  Shirt,
  Smartphone,
  UtensilsCrossed,
  Wallet,
  Wine,
} from "lucide-react";

export type CategoryVisual = {
  icon: LucideIcon;
  color: string;
  bg: string;
};

/**
 * 支出カテゴリは色相をずらして重複しないようにする。
 * （食費オレンジ / 住居はレンガ色、通信は紺、その他はグレー など）
 */
const EXPENSE_VISUALS: Record<string, CategoryVisual> = {
  食費: { icon: UtensilsCrossed, color: "#ea580c", bg: "#fff7ed" },
  日用品: { icon: Package, color: "#16a34a", bg: "#f0fdf4" },
  衣服: { icon: Shirt, color: "#2563eb", bg: "#eff6ff" },
  美容: { icon: Heart, color: "#db2777", bg: "#fdf2f8" },
  交際費: { icon: Wine, color: "#9333ea", bg: "#faf5ff" },
  医療費: { icon: Pill, color: "#dc2626", bg: "#fef2f2" },
  教育費: { icon: GraduationCap, color: "#4f46e5", bg: "#eef2ff" },
  光熱費: { icon: Droplets, color: "#0891b2", bg: "#ecfeff" },
  交通費: { icon: Bus, color: "#ca8a04", bg: "#fefce8" },
  通信費: { icon: Smartphone, color: "#1d4ed8", bg: "#dbeafe" },
  住居費: { icon: Home, color: "#b45309", bg: "#fef3c7" },
  その他: { icon: CircleEllipsis, color: "#64748b", bg: "#f1f5f9" },
  // 既存データ互換（新カテゴリと同系統で揃える）
  交通: { icon: Bus, color: "#ca8a04", bg: "#fefce8" },
  娯楽: { icon: Wine, color: "#9333ea", bg: "#faf5ff" },
  医療: { icon: Pill, color: "#dc2626", bg: "#fef2f2" },
  住居: { icon: Home, color: "#b45309", bg: "#fef3c7" },
};

const INCOME_VISUALS: Record<string, CategoryVisual> = {
  給料: { icon: Wallet, color: "#15803d", bg: "#dcfce7" },
  おこづかい: { icon: PiggyBank, color: "#d97706", bg: "#ffedd5" },
  賞与: { icon: Gift, color: "#e11d48", bg: "#ffe4e6" },
  副業: { icon: Briefcase, color: "#0284c7", bg: "#e0f2fe" },
  投資: { icon: Coins, color: "#0f766e", bg: "#ccfbf1" },
  臨時収入: { icon: HandCoins, color: "#c026d3", bg: "#fae8ff" },
  その他: { icon: CircleEllipsis, color: "#57534e", bg: "#f5f5f4" },
};

const FALLBACK: CategoryVisual = {
  icon: CircleHelp,
  color: "#64748b",
  bg: "#f8fafc",
};

export function getCategoryVisual(
  category: string,
  type: "expense" | "income" = "expense",
): CategoryVisual {
  const map = type === "income" ? INCOME_VISUALS : EXPENSE_VISUALS;
  return map[category] ?? FALLBACK;
}

export function CategoryIconBadge({
  category,
  type = "expense",
  size = "md",
}: {
  category: string;
  type?: "expense" | "income";
  size?: "sm" | "md";
}) {
  const visual = getCategoryVisual(category, type);
  const Icon = visual.icon;
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={`inline-flex ${box} items-center justify-center rounded-full`}
      style={{ backgroundColor: visual.bg, color: visual.color }}
      aria-hidden
    >
      <Icon className={iconSize} strokeWidth={2} />
    </span>
  );
}
