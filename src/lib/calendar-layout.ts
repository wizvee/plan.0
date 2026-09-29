import { DEFAULT_DURATION_MINUTES, DEFAULT_START_MINUTES, HOUR_HEIGHT, MIN_BLOCK_HEIGHT } from "@/lib/time";
import type { Todo } from "@/lib/types";

/**
 * 주 보기에서 겹치는 블록 배치 (구글 캘린더식 들여쓰기, 2026-09-29 시안 ②).
 * 겹치면 늦게 시작한 블록(같은 시각이면 짧은 쪽)이 한 단계 들여서 위에 올라간다.
 * 아래 블록은 전체 너비 그대로라 제목 앞부분과 왼쪽 띠가 늘 보이고 눌린다.
 */

/** 한 단계 들여쓰기 — 칸이 넓으면 60px("○ L사"까지 보임), 좁으면 칸의 30% (위 블록이 늘 70% 이상) */
const INDENT_STEP = "min(60px, 30%)";
/** 여러 단계가 쌓여도 맨 위 블록이 칸의 절반보다 좁아지지 않게 */
const MAX_INDENT = "50%";
/** 블록 기본 왼쪽 여백 (px) */
const BASE_LEFT_PX = 3;

/** 화면에 보이는 길이(분) — 짧은 블록도 최소 높이만큼은 그려지므로 그만큼 겹친다고 본다 */
function visibleDuration(todo: Todo): number {
  const minMinutes = (MIN_BLOCK_HEIGHT / HOUR_HEIGHT) * 60;
  return Math.max(todo.durationMinutes ?? DEFAULT_DURATION_MINUTES, minMinutes);
}

export interface PlacedBlock {
  todo: Todo;
  /** 0 = 들여쓰지 않음, 1 = 한 단계, … */
  depth: number;
}

/**
 * 하루 칸의 블록들을 그릴 순서와 들여쓰기 단계로 바꾼다.
 * 반환 순서대로 그리면 들여쓴 블록이 항상 자기가 덮는 블록보다 뒤(위)에 온다.
 */
export function layoutDayBlocks(todos: Todo[]): PlacedBlock[] {
  const spans = todos.map((todo) => {
    const start = todo.startMinutes ?? DEFAULT_START_MINUTES;
    return { todo, start, end: start + visibleDuration(todo) };
  });
  // 이른 것 먼저, 같은 시각이면 긴 것 먼저 — 긴 블록(업무)이 바닥에 깔린다
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: (PlacedBlock & { start: number; end: number })[] = [];
  for (const span of spans) {
    let depth = 0;
    for (const prev of placed) {
      if (prev.start < span.end && span.start < prev.end) depth = Math.max(depth, prev.depth + 1);
    }
    placed.push({ ...span, depth });
  }
  return placed.map(({ todo, depth }) => ({ todo, depth }));
}

/** 들여쓰기 단계 → 블록의 CSS `left` */
export function blockLeft(depth: number): string {
  if (depth === 0) return `${BASE_LEFT_PX}px`;
  return `calc(${BASE_LEFT_PX}px + min(${depth} * ${INDENT_STEP}, ${MAX_INDENT}))`;
}
