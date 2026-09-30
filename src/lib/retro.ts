/**
 * 회고 = 메모 줄 표시 `[p]` 잘한 점 · `[c]` 아쉬운 점 · `[I]` 다음엔 (MEMO-MARKS-PLAN.md 7번, 2026-09-30 회고 테이블에서 옮김).
 * 저장은 할 일 메모 원문 그대로. 프로젝트 전체 회고(할 일에 안 붙은 것)는 "〈프로젝트〉 회고" 노트의 메모에 줄로 둔다.
 * 전부 순수 함수 — 프로젝트 회고 탭 · 할 일 팝업이 쓴다.
 */
import { parseMemoLine, parseMemoLines, type MarkKind, type MarkState } from "@/lib/memo-marks";
import type { Todo } from "@/lib/types";

export type RetroKind = Extract<MarkKind, "keep" | "problem" | "try">;

export const RETRO_KINDS: RetroKind[] = ["keep", "problem", "try"];

export const RETRO_STATE: Record<RetroKind, MarkState> = { keep: "p", problem: "c", try: "I" };

const STATE_RETRO: Partial<Record<MarkState, RetroKind>> = { p: "keep", c: "problem", I: "try" };

/** 노트로 저장할 때 종류별 제목 */
export const RETRO_HEADING: Record<RetroKind, string> = { keep: "잘한 점", problem: "아쉬운 점", try: "다음엔" };

/** "다음엔" 줄을 할 일로 만들었다는 표시 — 줄 끝에 붙인다 (MEMO-MARKS-PLAN.md 7번) */
export const CONVERTED_SUFFIX = " → 할 일로 만듦";
const CONVERTED_MARK = CONVERTED_SUFFIX.trim();

export function retroKindOf(state: MarkState | null): RetroKind | null {
  return state ? (STATE_RETRO[state] ?? null) : null;
}

/** 메모에 회고 줄(`[p]` `[c]` `[I]`)이 하나라도 있는지 */
export function hasRetroLines(memo: string | null | undefined): boolean {
  return Boolean(memo) && parseMemoLines(memo!).some((line) => retroKindOf(line.state) !== null && line.text.trim() !== "");
}

/** 프로젝트 전체 회고를 모아 두는 노트 이름 */
export function retroNoteTitle(projectName: string): string {
  return `${projectName} 회고`;
}

/**
 * 프로젝트 전체 회고 노트 — 프로젝트에 붙은 노트 중 이름이 "〈프로젝트〉 회고"인 것.
 * 프로젝트 이름을 바꿨으면 이름이 "회고"로 끝나는 노트를 대신 쓴다(새 노트가 또 생기지 않게).
 */
export function findRetroNote(todos: Todo[], projectId: string, projectName: string): Todo | null {
  const notes = todos.filter((t) => t.kind === "note" && t.projectId === projectId);
  const title = retroNoteTitle(projectName);
  return notes.find((t) => t.content === title) ?? notes.find((t) => t.content.trim().endsWith("회고")) ?? null;
}

export interface RetroItem {
  kind: RetroKind;
  /** 줄 글자(줄 표시 · "할 일로 만듦" 표시를 뗀 것) */
  text: string;
  /** "다음엔"을 할 일로 만들었는지 */
  converted: boolean;
  todo: Todo;
  lineIndex: number;
  /** 프로젝트 전체 회고 노트에 적은 줄 */
  projectWide: boolean;
  /** 최근 순 정렬 키 — 캘린더 날짜, 없으면 만든 날 */
  sortKey: string;
}

/** 프로젝트에 붙은 할 일 · 노트의 메모에서 회고 줄을 모은다 — 최근 날짜 먼저, 같은 할 일 안에서는 줄 순서. */
export function collectProjectRetro(todos: Todo[], projectId: string, retroNoteId: string | null): RetroItem[] {
  const items: RetroItem[] = [];
  for (const todo of todos) {
    if (todo.projectId !== projectId || !todo.memo) continue;
    const sortKey = todo.scheduledDate ?? todo.createdAt.slice(0, 10);
    todo.memo.split("\n").forEach((raw, lineIndex) => {
      const line = parseMemoLine(raw);
      const kind = retroKindOf(line.state);
      if (!kind) return;
      const converted = line.text.endsWith(CONVERTED_MARK);
      const text = converted ? line.text.slice(0, -CONVERTED_MARK.length).trimEnd() : line.text;
      if (!text.trim()) return;
      items.push({ kind, text, converted, todo, lineIndex, projectWide: todo.id === retroNoteId, sortKey });
    });
  }
  // sort는 안정 정렬 — 같은 날짜 안에서는 할 일 · 줄 순서 그대로
  return items.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
}

/** 메모 끝에 회고 줄 하나를 붙인 새 메모 */
export function appendRetroLine(memo: string | null, kind: RetroKind, text: string): string {
  const line = `- [${RETRO_STATE[kind]}] ${text.trim()}`;
  const base = (memo ?? "").trimEnd();
  return base ? `${base}\n${line}` : line;
}

/** "다음엔" 줄 끝에 "→ 할 일로 만듦"을 붙인 새 메모 (이미 있으면 그대로) */
export function markConverted(memo: string, lineIndex: number): string {
  const lines = memo.split("\n");
  const raw = lines[lineIndex];
  if (raw === undefined || raw.trimEnd().endsWith(CONVERTED_MARK)) return memo;
  lines[lineIndex] = `${raw.trimEnd()}${CONVERTED_SUFFIX}`;
  return lines.join("\n");
}

/** 날짜 키(yyyy-MM-dd) → "9/30" */
export function retroDateLabel(sortKey: string): string {
  const [, m, d] = sortKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/**
 * 프로젝트 회고를 마크다운 노트 본문으로 — "회고 노트로 저장"이 자료 탭 편집기에 채워 넣는다.
 * 종류별 `## 제목` 아래 `- 내용 — 출처 · 날짜`. 비어 있는 종류는 뺀다.
 */
export function buildRetroMarkdown(items: RetroItem[]): string {
  const sections: string[] = [];
  for (const kind of RETRO_KINDS) {
    const lines = items
      .filter((item) => item.kind === kind)
      .map((item) => `- ${item.text} — ${item.projectWide ? "프로젝트 전체" : item.todo.content} · ${retroDateLabel(item.sortKey)}`);
    if (lines.length > 0) sections.push(`## ${RETRO_HEADING[kind]}\n\n${lines.join("\n")}`);
  }
  return sections.join("\n\n") + "\n";
}
