/**
 * 메모 줄 표시(옵시디언 커스텀 체크박스 문법) — MEMO-MARKS-PLAN.md 2 · 3 · 4번.
 * 저장은 메모 원문 그대로이고, 여기 함수들은 원문 글자를 읽고 고치기만 한다(DB 변경 없음).
 *
 *   `- [ ]` / `- [x]` 확인 필요 · 확인함     `- [?]` / `- [i]` 질문 · 알게 된 것(+ `→ 답`)
 *   `- [p]` 잘한 점   `- [c]` 아쉬운 점   `- [I]` 다음엔(대문자 i)
 */

/** 표시 종류 — 툴바 버튼 하나 = 종류 하나. 확인 · 질문은 열림/끝남 두 상태가 있다. */
export type MarkKind = "check" | "question" | "keep" | "problem" | "try";

/** 괄호 안 글자. `[X]`는 읽을 때 `x`로 맞춘다. `i` · `I`는 대소문자를 구분한다. */
export type MarkState = " " | "x" | "?" | "i" | "p" | "c" | "I";

export const MARK_KINDS: MarkKind[] = ["check", "question", "keep", "problem", "try"];

/** 종류별 열림 상태 글자 — 툴바 · Enter 이어 쓰기가 붙이는 표시 */
const OPEN_STATE: Record<MarkKind, MarkState> = { check: " ", question: "?", keep: "p", problem: "c", try: "I" };

const STATE_KIND: Record<MarkState, MarkKind> = {
  " ": "check",
  x: "check",
  "?": "question",
  i: "question",
  p: "keep",
  c: "problem",
  I: "try",
};

export interface MemoLine {
  /** 원문 한 줄 */
  raw: string;
  /** 줄 앞 공백(들여쓰기) */
  indent: string;
  /** `-` · `*` · `•` · `1.` 같은 불릿. 없으면 null */
  bullet: string | null;
  /** 표시 글자. 표시가 없는 보통 줄이면 null */
  state: MarkState | null;
  kind: MarkKind | null;
  /** 확인함(`[x]`) · 알게 된 것(`[i]`) */
  done: boolean;
  /** 표시 · 불릿을 뺀 나머지 글자 */
  text: string;
}

// 2번 인식 규칙 — 불릿은 있어도 없어도 된다. 표시 뒤에 글자가 없어도(`- [ ]`만 친 줄) 표시로 읽는다.
const MARK_LINE = /^(\s*)(?:([-*•]|\d+\.)\s*)?\[( |x|X|\?|i|I|p|c)\](?:\s+(.*))?$/;
// 예전 표시 `☐` · `☑` — `[ ]` · `[x]`로 읽는다(한꺼번에 바꾸지 않고, 누르거나 툴바를 쓸 때 그 줄만 새 문법으로)
const LEGACY_LINE = /^(\s*)(?:([-*•]|\d+\.)\s*)?([☐☑])\s*(.*)$/;
const BULLET_LINE = /^(\s*)([-*•]|\d+\.)\s+(.*)$/;

export function parseMemoLine(raw: string): MemoLine {
  const mark = MARK_LINE.exec(raw);
  if (mark) {
    const state = (mark[3] === "X" ? "x" : mark[3]) as MarkState;
    return {
      raw,
      indent: mark[1],
      bullet: mark[2] ?? null,
      state,
      kind: STATE_KIND[state],
      done: state === "x" || state === "i",
      text: mark[4] ?? "",
    };
  }
  const legacy = LEGACY_LINE.exec(raw);
  if (legacy) {
    const state: MarkState = legacy[3] === "☑" ? "x" : " ";
    return { raw, indent: legacy[1], bullet: legacy[2] ?? null, state, kind: "check", done: state === "x", text: legacy[4] };
  }
  const bullet = BULLET_LINE.exec(raw);
  if (bullet) {
    return { raw, indent: bullet[1], bullet: bullet[2], state: null, kind: null, done: false, text: bullet[3] };
  }
  const indent = /^\s*/.exec(raw)![0];
  return { raw, indent, bullet: null, state: null, kind: null, done: false, text: raw.slice(indent.length) };
}

export function parseMemoLines(text: string): MemoLine[] {
  return text.split("\n").map(parseMemoLine);
}

export function hasMemoMarks(text: string | null | undefined): boolean {
  return Boolean(text) && parseMemoLines(text!).some((line) => line.state !== null);
}

/** 표시가 붙은 한 줄 원문. 불릿이 없던 줄엔 `-`를 붙인다. */
function formatMarkLine(indent: string, bullet: string | null, state: MarkState, text: string): string {
  return `${indent}${bullet ?? "-"} [${state}] ${text}`;
}

/** 표시를 뗀 한 줄 — 불릿은 남긴다(`- [ ] 내용` → `- 내용`). */
function formatPlainLine(line: MemoLine): string {
  return line.bullet ? `${line.indent}${line.bullet} ${line.text}` : `${line.indent}${line.text}`;
}

function withState(line: MemoLine, state: MarkState): string {
  return formatMarkLine(line.indent, line.bullet, state, line.text);
}

/**
 * 툴바 — 주어진 줄들에 종류 `kind`를 적용한 새 줄들.
 * 모든 줄이 이미 그 종류면 뗀다(같은 버튼 다시 누르기). 아니면 표시가 없는 줄엔 붙이고, 다른 표시는 바꾼다.
 * 끝난 상태(`[x]` · `[i]`)도 같은 종류로 친다. 여러 줄을 고를 때 빈 줄은 건드리지 않는다.
 */
export function applyMark(lines: string[], kind: MarkKind): string[] {
  const parsed = lines.map(parseMemoLine);
  const targets = parsed.filter((line) => lines.length === 1 || line.text.trim() !== "" || line.state !== null);
  const removing = targets.length > 0 && targets.every((line) => line.kind === kind);
  return parsed.map((line) => {
    if (!targets.includes(line)) return line.raw;
    if (removing) return formatPlainLine(line);
    // 같은 종류의 끝난 줄은 그대로 두고, 나머지는 열림 상태로
    if (line.kind === kind) return line.raw;
    return withState(line, OPEN_STATE[kind]);
  });
}

/** 줄들의 공통 종류 — 툴바 버튼 눌림 표시용. 표시 없는 줄이 섞이거나 종류가 다르면 null. */
export function commonKind(lines: string[]): MarkKind | null {
  const kinds = lines.map((raw) => parseMemoLine(raw)).filter((l) => l.text.trim() !== "" || l.state !== null);
  if (kinds.length === 0) return parseMemoLine(lines[0] ?? "").kind;
  const first = kinds[0].kind;
  return kinds.every((l) => l.kind === first) ? first : null;
}

function replaceLine(text: string, lineIndex: number, next: (line: MemoLine) => string): string {
  const lines = text.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return text;
  lines[lineIndex] = next(parseMemoLine(lines[lineIndex]));
  return lines.join("\n");
}

/** 보기 모드 체크박스 — `[ ]` ↔ `[x]`. 확인 줄이 아니면 그대로. */
export function toggleDone(text: string, lineIndex: number): string {
  return replaceLine(text, lineIndex, (line) =>
    line.kind === "check" ? withState(line, line.done ? " " : "x") : line.raw
  );
}

/** 질문 해결 — `[?]` → `[i]`, 답이 있으면 줄 끝에 ` → 답`. */
export function resolveQuestion(text: string, lineIndex: number, answer: string): string {
  const trimmed = answer.trim();
  return replaceLine(text, lineIndex, (line) => {
    if (line.state !== "?") return line.raw;
    const body = trimmed ? `${line.text.trimEnd()} → ${trimmed}` : line.text;
    return formatMarkLine(line.indent, line.bullet, "i", body);
  });
}

/** 알게 된 것 → 질문으로 되돌리기 — `[i]` → `[?]`. 적어 둔 답은 남긴다. */
export function reopenQuestion(text: string, lineIndex: number): string {
  return replaceLine(text, lineIndex, (line) => (line.state === "i" ? withState(line, "?") : line.raw));
}

/** 질문 · 알게 된 것 줄의 `질문 → 답`을 나눈다. 답이 없으면 answer는 null. */
export function splitAnswer(text: string): { question: string; answer: string | null } {
  const at = text.indexOf(" → ");
  if (at < 0) return { question: text, answer: null };
  return { question: text.slice(0, at), answer: text.slice(at + 3) };
}

/**
 * Enter로 이어 쓰기 — 표시가 있는 줄 끝에서 Enter를 눌렀을 때 할 일.
 * - `continue`: 다음 줄을 `prefix`(같은 종류 열림 상태 표시)로 시작
 * - `clear`: 표시만 있는 빈 줄 → 표시를 떼고(들여쓰기만 남김) 보통 줄로
 * - null: 표시 없는 줄 — 평소 Enter
 */
export function continueOnEnter(
  line: string
): { type: "continue"; prefix: string } | { type: "clear"; replacement: string } | null {
  const parsed = parseMemoLine(line);
  if (parsed.state === null || parsed.kind === null) return null;
  if (parsed.text.trim() === "") return { type: "clear", replacement: parsed.indent };
  return { type: "continue", prefix: `\n${formatMarkLine(parsed.indent, parsed.bullet, OPEN_STATE[parsed.kind], "")}` };
}

/** 텍스트 위치 `offset`이 몇 번째 줄인지, 그 줄의 시작 · 끝 위치 */
export function lineRangeAt(text: string, offset: number): { index: number; start: number; end: number } {
  const start = text.slice(0, offset).lastIndexOf("\n") + 1;
  const endAt = text.indexOf("\n", offset);
  const end = endAt < 0 ? text.length : endAt;
  const index = text.slice(0, start).split("\n").length - 1;
  return { index, start, end };
}
