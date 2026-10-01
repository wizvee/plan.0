import type { ContextColor } from "@/lib/types";

/**
 * 컨텍스트 색 (BALANCE-PLAN.md 4번 · 시안 ⑥). 애플 시스템 컬러 8가지 — 고르는 순서도 이 순서.
 * 파랑 · 초록 · 보라는 PARA 색 토큰을 그대로 쓴다(새 hex를 늘리지 않게). `lib/category.ts`와 같은 모양.
 */
export const CONTEXT_COLORS: ContextColor[] = ["blue", "green", "purple", "orange", "indigo", "teal", "pink", "gray"];

export const CONTEXT_COLOR_LABEL: Record<ContextColor, string> = {
  blue: "파랑",
  green: "초록",
  purple: "보라",
  orange: "주황",
  indigo: "남색",
  teal: "청록",
  pink: "분홍",
  gray: "회색",
};

export const CONTEXT_COLOR_VAR: Record<ContextColor, string> = {
  blue: "--primary",
  green: "--category-area",
  purple: "--category-resource",
  orange: "--ctx-orange",
  indigo: "--ctx-indigo",
  teal: "--ctx-teal",
  pink: "--ctx-pink",
  gray: "--ctx-gray",
};

export const CONTEXT_TINT_VAR: Record<ContextColor, string> = {
  blue: "--accent",
  green: "--category-area-tint",
  purple: "--category-resource-tint",
  orange: "--ctx-orange-tint",
  indigo: "--ctx-indigo-tint",
  teal: "--ctx-teal-tint",
  pink: "--ctx-pink-tint",
  gray: "--ctx-gray-tint",
};

/** `style={{ backgroundColor: contextColor(c) }}` */
export function contextColor(color: ContextColor): string {
  return `var(${CONTEXT_COLOR_VAR[color]})`;
}

/** 새 컨텍스트에 줄 색 — 아직 아무도 안 쓰는 첫 색(회색은 마지막), 다 쓰였으면 회색 */
export function nextUnusedColor(used: ContextColor[]): ContextColor {
  return CONTEXT_COLORS.find((c) => !used.includes(c)) ?? "gray";
}
