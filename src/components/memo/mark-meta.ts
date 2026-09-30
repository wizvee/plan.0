import { Lightbulb, Question, Square, ThumbsDown, ThumbsUp, type Icon } from "@/components/icons";

import type { MarkKind } from "@/lib/memo-marks";

/**
 * 메모 줄 표시 종류별 라벨 · 툴바 아이콘 · 색 (MEMO-MARKS-PLAN.md 3 · 4번).
 * 색은 아이콘에만 쓴다 — 줄 글자는 기본 전경색. 확인은 체크박스라 색 토큰 대신 primary.
 */
export const MARK_META: Record<MarkKind, { label: string; icon: Icon; color: string; tint: string }> = {
  check: { label: "확인", icon: Square, color: "var(--foreground)", tint: "rgba(0, 0, 0, 0.08)" },
  question: { label: "질문", icon: Question, color: "var(--mark-question)", tint: "var(--mark-question-tint)" },
  keep: { label: "잘한 점", icon: ThumbsUp, color: "var(--mark-keep)", tint: "var(--mark-keep-tint)" },
  problem: { label: "아쉬운 점", icon: ThumbsDown, color: "var(--mark-problem)", tint: "var(--mark-problem-tint)" },
  try: { label: "다음엔", icon: Lightbulb, color: "var(--mark-try)", tint: "var(--mark-try-tint)" },
};
