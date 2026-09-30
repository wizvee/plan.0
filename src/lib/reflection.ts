import { Lightbulb, ThumbsDown, ThumbsUp, type Icon } from "@/components/icons";

import type { ReflectionKind } from "@/lib/types";

/** 회고 종류별 라벨 · 아이콘 · 입력칸 안내 문구. 색은 `REFLECTION_COLOR_VAR` · `REFLECTION_TINT_VAR`. */
export const REFLECTION_META: Record<
  ReflectionKind,
  { label: string; placeholder: string; icon: Icon; markdownHeading: string }
> = {
  keep: { label: "잘한 점", placeholder: "잘한 점 추가", icon: ThumbsUp, markdownHeading: "잘한 점" },
  problem: { label: "아쉬운 점", placeholder: "아쉬운 점 추가", icon: ThumbsDown, markdownHeading: "아쉬운 점" },
  try: { label: "다음엔", placeholder: "다음엔 이렇게", icon: Lightbulb, markdownHeading: "다음엔" },
};

/** 아이콘 색 CSS 변수 (globals.css). 텍스트에는 쓰지 않는다 — 텍스트는 항상 기본 전경색. */
export const REFLECTION_COLOR_VAR: Record<ReflectionKind, string> = {
  keep: "--retro-keep",
  problem: "--retro-problem",
  try: "--retro-try",
};

/** 아이콘 타일 배경 CSS 변수 */
export const REFLECTION_TINT_VAR: Record<ReflectionKind, string> = {
  keep: "--retro-keep-tint",
  problem: "--retro-problem-tint",
  try: "--retro-try-tint",
};

/** 회고 작성일 "9/26" (로컬 시간). 데이터가 클라이언트에서만 로드되므로 SSR 시간대 문제 없음. */
export function reflectionDateLabel(createdAt: string): string {
  const d = new Date(createdAt);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 프로젝트 회고를 마크다운 노트 본문으로 — "회고 노트로 저장"이 자료 탭 편집기에 채워 넣는다.
 * 종류별 `## 제목` 아래 `- 내용 — 출처 · 날짜`. 비어 있는 종류는 뺀다.
 */
export function buildRetroMarkdown(
  items: { kind: ReflectionKind; content: string; source: string | null; createdAt: string }[]
): string {
  const sections: string[] = [];
  for (const kind of ["keep", "problem", "try"] as const) {
    const lines = items
      .filter((item) => item.kind === kind)
      .map((item) => `- ${item.content} — ${item.source ?? "프로젝트 전체"} · ${reflectionDateLabel(item.createdAt)}`);
    if (lines.length > 0) sections.push(`## ${REFLECTION_META[kind].markdownHeading}\n\n${lines.join("\n")}`);
  }
  return sections.join("\n\n") + "\n";
}
