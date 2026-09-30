/**
 * 키워드 검색 — SEARCH-PLAN.md 3번 규칙. 서버 · DB 없이 브라우저에 불러와 있는 데이터로 찾는다.
 * 전부 순수 함수: `buildSearchIndex`(데이터가 바뀔 때만) → `search(index, query)`(입력할 때마다).
 *
 * - 검색어만 다듬는다(NFKC · 소문자 · 조사 떼기 · 한 글자 버리기). 원문은 쪼개지 않고 **포함 여부**로 비교해
 *   `DSP에서` · `계산하는`처럼 붙은 말도 걸린다. 하이픈 · 밑줄 · 공백을 뺀 형태로도 한 번 더 본다(`ci-ds` = `cids`).
 * - 비교 단위는 줄(메모 한 줄 · 하위 할 일 하나 · URL), 결과 카드는 할 일 하나.
 * - 이모지만 치거나 줄 표시(`[?]` 등)를 치면 점수 없이 "그 줄 전부"를 최근 순으로(줄 모드).
 */
import { parseMemoLine, type MarkState } from "@/lib/memo-marks";
import type { Area, ParaKind, Project, Resource, Subtask, Todo } from "@/lib/types";

// ---------- 정규화 ----------

/** 이모지 한 덩어리(ZWJ로 이은 것 포함). 변형 선택자(U+FE0F)는 정규화에서 뺀다. */
const EMOJI = /\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*/gu;
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|‍)+$/u;
/** 단어를 나누는 문장부호 — `-` · `_`는 단어 안에 남긴다(`CI-DS` · `RESP_DIV_TAB`). `.`은 숫자 사이(`0.25`)만 남긴다. */
const SEPARATORS = /[\s?!,;:()[\]{}"'“”‘’`<>=+*&^%$#@~|\\/·…]+|\.(?!\d)|(?<!\d)\./u;
/** 줄 표시 검색어 — `[?]` · `[ ]` · `[x]` … (MEMO-MARKS-PLAN.md 5번) */
const MARK_TOKEN = /\[( |x|X|\?|i|I|p|c)\]/g;
/** 한글 조사 — 긴 것부터 */
const PARTICLES = ["에서", "으로", "까지", "부터", "은", "는", "이", "가", "을", "를", "에", "의", "로", "와", "과", "도", "만"];

/** 원문 · 검색어 공통 정규화: NFKC · 소문자 · 변형 선택자 제거 */
export function normalizeText(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/️/g, "");
}

/** 하이픈 · 밑줄 · 공백을 뺀 비교용 형태 */
function compactOf(normalized: string): string {
  return normalized.replace(/[-_\s]+/g, "");
}

export interface NormalizedQuery {
  /** 비교할 단어(이모지 포함). 순서대로, 중복 없음 */
  words: string[];
  /** words 중 이모지만 */
  emojis: string[];
  /** 검색어에 친 줄 표시 */
  marks: MarkState[];
}

function stripParticle(word: string): string {
  for (const particle of PARTICLES) {
    if (word.endsWith(particle) && word.length - particle.length >= 2) return word.slice(0, -particle.length);
  }
  return word;
}

/** 검색어 다듬기 — SEARCH-PLAN.md 3-2 */
export function normalizeQuery(query: string): NormalizedQuery {
  const marks: MarkState[] = [];
  for (const match of query.matchAll(MARK_TOKEN)) {
    const state = (match[1] === "X" ? "x" : match[1]) as MarkState;
    if (!marks.includes(state)) marks.push(state);
  }
  // 이모지는 붙어 있어도 따로 한 단어로
  const spaced = normalizeText(query.replace(MARK_TOKEN, " ")).replace(EMOJI, (e) => ` ${e} `);
  const words: string[] = [];
  const emojis: string[] = [];
  for (const raw of spaced.split(SEPARATORS)) {
    const token = raw.replace(/^[-_.]+|[-_.]+$/g, "");
    if (!token) continue;
    if (EMOJI_ONLY.test(token)) {
      if (!words.includes(token)) {
        words.push(token);
        emojis.push(token);
      }
      continue;
    }
    const word = stripParticle(token);
    // 한 글자는 버린다(거의 모든 기록에 있어 순위만 흐림) — 숫자는 남긴다
    if ([...word].length < 2 && !/^\d$/.test(word)) continue;
    if (!words.includes(word)) words.push(word);
  }
  return { words, emojis, marks };
}

// ---------- 색인 ----------

interface IndexedText {
  norm: string;
  compact: string;
}

function indexText(text: string): IndexedText {
  const norm = normalizeText(text);
  return { norm, compact: compactOf(norm) };
}

export type LineSource = "memo" | "subtask" | "url";

export interface IndexedLine extends IndexedText {
  source: LineSource;
  /** 화면에 보일 글자 — 메모는 불릿 · 줄 표시를 뗀 나머지, 하위 할 일은 내용, URL은 주소 */
  text: string;
  /** 메모 줄 번호 */
  lineIndex: number | null;
  /** 메모 줄 표시 */
  mark: MarkState | null;
  subtask: Subtask | null;
}

export interface SearchPara {
  kind: ParaKind;
  id: string;
  name: string;
  /** 완료된 프로젝트 · 보관된 영역/리소스 */
  closed: boolean;
}

interface IndexedPara extends SearchPara, IndexedText {}

interface IndexedTodo {
  todo: Todo;
  title: IndexedText;
  para: IndexedPara | null;
  lines: IndexedLine[];
  /** 메모 원문 줄 (스니펫용) */
  memoLines: string[];
  /** 최근 순 정렬 키 — 캘린더 날짜, 없으면 만든 날 */
  sortKey: string;
}

export interface SearchIndex {
  todos: IndexedTodo[];
  paras: IndexedPara[];
}

export interface SearchData {
  todos: Todo[];
  subtasks: Subtask[];
  projects: Project[];
  areas: Area[];
  resources: Resource[];
}

/** 할 일 · 하위 할 일 · PARA → 정규화된 줄 목록. 데이터가 바뀔 때만 다시 만든다. */
export function buildSearchIndex({ todos, subtasks, projects, areas, resources }: SearchData): SearchIndex {
  const paras: IndexedPara[] = [
    ...projects.map((p) => ({ kind: "project" as const, id: p.id, name: p.name, closed: p.status === "completed" })),
    ...areas.map((a) => ({ kind: "area" as const, id: a.id, name: a.name, closed: a.archived })),
    ...resources.map((r) => ({ kind: "resource" as const, id: r.id, name: r.name, closed: r.archived })),
  ].map((p) => ({ ...p, ...indexText(p.name) }));
  const paraById = new Map(paras.map((p) => [`${p.kind}:${p.id}`, p]));

  const subtasksByTodo = new Map<string, Subtask[]>();
  for (const subtask of subtasks) {
    const list = subtasksByTodo.get(subtask.todoId);
    if (list) list.push(subtask);
    else subtasksByTodo.set(subtask.todoId, [subtask]);
  }

  const indexed = todos.map((todo): IndexedTodo => {
    const lines: IndexedLine[] = [];
    const memoLines = todo.memo ? todo.memo.split("\n") : [];
    memoLines.forEach((raw, lineIndex) => {
      const parsed = parseMemoLine(raw);
      if (!parsed.text.trim()) return;
      lines.push({ source: "memo", text: parsed.text, lineIndex, mark: parsed.state, subtask: null, ...indexText(parsed.text) });
    });
    const own = (subtasksByTodo.get(todo.id) ?? []).slice().sort((a, b) => a.position - b.position);
    for (const subtask of own) {
      lines.push({ source: "subtask", text: subtask.content, lineIndex: null, mark: null, subtask, ...indexText(subtask.content) });
    }
    if (todo.url) {
      lines.push({ source: "url", text: todo.url, lineIndex: null, mark: null, subtask: null, ...indexText(todo.url) });
    }
    const paraKey = todo.projectId
      ? `project:${todo.projectId}`
      : todo.areaId
        ? `area:${todo.areaId}`
        : todo.resourceId
          ? `resource:${todo.resourceId}`
          : null;
    return {
      todo,
      title: indexText(todo.content),
      para: paraKey ? (paraById.get(paraKey) ?? null) : null,
      lines,
      memoLines,
      sortKey: todo.scheduledDate ?? todo.createdAt.slice(0, 10),
    };
  });

  return { todos: indexed, paras };
}

// ---------- 비교 · 점수 ----------

function matchesWord(target: IndexedText, word: string, compactWord: string): boolean {
  if (target.norm.includes(word)) return true;
  return compactWord.length > 0 && target.compact.includes(compactWord);
}

function matchedWords(target: IndexedText, words: string[], compacts: string[]): Set<number> {
  const found = new Set<number>();
  words.forEach((word, i) => {
    if (matchesWord(target, word, compacts[i])) found.add(i);
  });
  return found;
}

export interface MatchedLine {
  line: IndexedLine;
  score: number;
}

export interface MemoSnippetLine {
  /** 메모 원문 줄 번호 */
  lineIndex: number;
  /** 원문 한 줄(불릿 · 줄 표시 포함 — 화면에서 `parseMemoLine`으로 그린다) */
  raw: string;
  /** 가장 잘 맞는 줄 — 굵게 */
  best: boolean;
  /** 단어가 하나라도 걸린 줄 */
  matched: boolean;
}

/** 메모 스니펫 — 짧으면(6줄 이하) 전체, 길면 일치한 줄과 앞뒤 1줄. `null`은 건너뛴 자리(…) */
export type MemoSnippet = (MemoSnippetLine | null)[];

export interface TodoHit {
  type: "todo";
  todo: Todo;
  para: SearchPara | null;
  score: number;
  /** 가장 잘 맞은 곳 — 결과를 누르면 그 탭으로 */
  bestSource: LineSource | "title";
  titleMatched: boolean;
  /** 일치한 하위 할 일(점수 순, 최대 3 — 메모 스니펫은 한 덩어리로 센다) */
  subtasks: MatchedLine[];
  memo: MemoSnippet | null;
  urlMatched: boolean;
  sortKey: string;
}

export interface ParaHit extends SearchPara {
  type: "para";
  /** 이름에서 걸린 단어 수 */
  score: number;
}

/** 줄 모드(이모지만 · 줄 표시) 결과 한 줄 */
export interface LineHit {
  type: "line";
  todo: Todo;
  para: SearchPara | null;
  /** `title`이면 할 일 제목 자체 */
  source: LineSource | "title";
  text: string;
  lineIndex: number | null;
  mark: MarkState | null;
  subtask: Subtask | null;
  sortKey: string;
}

export type SearchResult =
  | { mode: "empty" }
  | { mode: "ranked"; words: string[]; todos: TodoHit[]; paras: ParaHit[] }
  | { mode: "lines"; words: string[]; lines: LineHit[] };

const MAX_MATCHED_LINES = 3;
const SHORT_MEMO_LINES = 6;

function publicPara(para: IndexedPara | null): SearchPara | null {
  return para ? { kind: para.kind, id: para.id, name: para.name, closed: para.closed } : null;
}

function memoSnippet(item: IndexedTodo, scored: MatchedLine[], bestScore: number): MemoSnippet | null {
  const memo = scored.filter((m) => m.line.source === "memo");
  if (memo.length === 0) return null;
  const matchedIndexes = new Set(memo.map((m) => m.line.lineIndex!));
  const bestIndexes = new Set(memo.filter((m) => m.score === bestScore).map((m) => m.line.lineIndex!));
  // 가장 잘 맞는 줄이 메모 밖(하위 할 일 등)이면 메모 안에서 가장 잘 맞는 줄을 굵게
  if (bestIndexes.size === 0) {
    const top = Math.max(...memo.map((m) => m.score));
    memo.filter((m) => m.score === top).forEach((m) => bestIndexes.add(m.line.lineIndex!));
  }
  const toLine = (lineIndex: number): MemoSnippetLine => ({
    lineIndex,
    raw: item.memoLines[lineIndex],
    best: bestIndexes.has(lineIndex),
    matched: matchedIndexes.has(lineIndex),
  });

  const nonEmpty = item.memoLines.map((raw, i) => (raw.trim() ? i : -1)).filter((i) => i >= 0);
  if (nonEmpty.length <= SHORT_MEMO_LINES) return nonEmpty.map(toLine);

  // 긴 메모 — 점수 높은 줄 몇 개와 앞뒤 1줄(빈 줄은 건너뛰고 센다)
  const shown = new Set<number>();
  const top = memo.slice().sort((a, b) => b.score - a.score).slice(0, MAX_MATCHED_LINES);
  for (const m of top) {
    const at = nonEmpty.indexOf(m.line.lineIndex!);
    for (const j of [at - 1, at, at + 1]) if (j >= 0 && j < nonEmpty.length) shown.add(nonEmpty[j]);
  }
  const sorted = [...shown].sort((a, b) => a - b);
  const snippet: MemoSnippet = [];
  sorted.forEach((lineIndex, k) => {
    const gap = k === 0 ? lineIndex !== nonEmpty[0] : nonEmpty.indexOf(lineIndex) !== nonEmpty.indexOf(sorted[k - 1]) + 1;
    if (gap) snippet.push(null);
    snippet.push(toLine(lineIndex));
  });
  if (sorted[sorted.length - 1] !== nonEmpty[nonEmpty.length - 1]) snippet.push(null);
  return snippet;
}

function newestFirst(a: { sortKey: string }, b: { sortKey: string }): number {
  return a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0;
}

export interface SearchOptions {
  /** 칩 — 이 줄 표시가 붙은 메모 줄만(줄 모드). 검색어에 친 `[?]` 등과 합친다 */
  marks?: MarkState[];
}

/** 검색 — SEARCH-PLAN.md 3-3 · 3-4 */
export function search(index: SearchIndex, query: string, options: SearchOptions = {}): SearchResult {
  const q = normalizeQuery(query);
  const marks = [...new Set([...(options.marks ?? []), ...q.marks])];
  const words = q.words;
  const compacts = words.map((w) => (q.emojis.includes(w) ? "" : compactOf(w)));

  // 줄 모드: 줄 표시가 있거나, 이모지만 쳤을 때 — 점수 없이 조건에 맞는 줄 전부를 최근 순으로
  const emojiOnly = words.length > 0 && q.emojis.length === words.length;
  if (marks.length > 0 || emojiOnly) {
    const lines: LineHit[] = [];
    for (const item of index.todos) {
      // 이모지는 그 줄에 있어야 하고, 다른 단어는 줄 · 제목 · PARA 어디든(좁히기)
      const context = new Set([...matchedWords(item.title, words, compacts), ...(item.para ? matchedWords(item.para, words, compacts) : [])]);
      const candidates: { source: LineSource | "title"; text: string; target: IndexedText; line: IndexedLine | null }[] =
        marks.length > 0
          ? item.lines.filter((l) => l.source === "memo" && l.mark !== null && marks.includes(l.mark)).map((l) => ({ source: l.source, text: l.text, target: l, line: l }))
          : [
              { source: "title" as const, text: item.todo.content, target: item.title, line: null },
              ...item.lines.map((l) => ({ source: l.source, text: l.text, target: l as IndexedText, line: l })),
            ];
      for (const c of candidates) {
        const own = matchedWords(c.target, words, compacts);
        const ok = words.every((w, i) => own.has(i) || (!q.emojis.includes(w) && context.has(i)));
        if (!ok) continue;
        lines.push({
          type: "line",
          todo: item.todo,
          para: publicPara(item.para),
          source: c.source,
          text: c.text,
          lineIndex: c.line?.lineIndex ?? null,
          mark: c.line?.mark ?? null,
          subtask: c.line?.subtask ?? null,
          sortKey: item.sortKey,
        });
      }
    }
    // 같은 날짜 안에서는 원래 순서(할 일 순서 · 줄 순서) 그대로 — sort는 안정 정렬
    lines.sort(newestFirst);
    return { mode: "lines", words, lines };
  }

  if (words.length === 0) return { mode: "empty" };

  const needed = Math.ceil(words.length / 2);
  const todos: TodoHit[] = [];
  for (const item of index.todos) {
    const titleWords = matchedWords(item.title, words, compacts);
    const paraWords = item.para ? matchedWords(item.para, words, compacts) : new Set<number>();

    const scoreFor = (lineWords: Set<number>): number | null => {
      if (lineWords.size === 0 && titleWords.size === 0) return null;
      const all = new Set([...lineWords, ...titleWords, ...paraWords]);
      if (all.size < needed) return null;
      let score = lineWords.size * 3;
      for (const i of titleWords) if (!lineWords.has(i)) score += 2;
      for (const i of paraWords) if (!lineWords.has(i) && !titleWords.has(i)) score += 1;
      return score;
    };

    const scored: MatchedLine[] = [];
    for (const line of item.lines) {
      const lineWords = matchedWords(line, words, compacts);
      if (lineWords.size === 0) continue;
      const score = scoreFor(lineWords);
      if (score !== null) scored.push({ line, score });
    }
    const titleOnly = scoreFor(new Set());
    if (scored.length === 0 && titleOnly === null) continue;

    const bestLine = scored.reduce<MatchedLine | null>((best, m) => (!best || m.score > best.score ? m : best), null);
    const score = Math.max(bestLine?.score ?? 0, titleOnly ?? 0);
    const subtasks = scored
      .filter((m) => m.line.source === "subtask")
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHED_LINES);
    const memo = memoSnippet(item, scored, score);
    // 메모 스니펫을 한 덩어리로 세서 카드당 일치 줄 최대 3개
    if (memo && subtasks.length > MAX_MATCHED_LINES - 1) subtasks.length = MAX_MATCHED_LINES - 1;

    todos.push({
      type: "todo",
      todo: item.todo,
      para: publicPara(item.para),
      score,
      bestSource: bestLine && bestLine.score >= (titleOnly ?? 0) ? bestLine.line.source : "title",
      titleMatched: titleWords.size > 0,
      subtasks,
      memo,
      urlMatched: scored.some((m) => m.line.source === "url"),
      sortKey: item.sortKey,
    });
  }
  // 같은 점수면 최근 날짜 먼저
  todos.sort((a, b) => b.score - a.score || newestFirst(a, b));

  // PARA — 이름에 검색 단어가 하나라도 있으면 위쪽 PARA 칸에(많이 걸린 순, 끝난 것은 뒤로)
  const paras: ParaHit[] = [];
  for (const para of index.paras) {
    const hit = matchedWords(para, words, compacts).size;
    if (hit > 0) paras.push({ type: "para", ...publicPara(para)!, score: hit });
  }
  paras.sort((a, b) => Number(a.closed) - Number(b.closed) || b.score - a.score || a.name.localeCompare(b.name));

  return { mode: "ranked", words, todos, paras };
}

// ---------- 화면용 도우미 ----------

/** `📝` 구분자 — 앞 = 한 일, 뒤 = 메모(강조). 📝가 없으면 memo는 null. (SEARCH-PLAN.md 3-5) */
export function splitMemoMark(text: string): { done: string; memo: string | null } {
  const at = text.indexOf("📝");
  if (at < 0) return { done: text, memo: null };
  return { done: text.slice(0, at).trimEnd(), memo: text.slice(at + "📝".length).trim() };
}

/**
 * 원문에서 검색 단어가 걸린 구간 `[시작, 끝)` — 옅은 배경 표시용. 대소문자 무시, 하이픈 · 밑줄 · 공백을 건너뛴
 * 비교(`cids` → `CI-DS`)도 원문 위치로 되돌려 준다. 겹치는 구간은 합친다.
 */
export function highlightRanges(text: string, words: string[]): [number, number][] {
  const lower = text.toLowerCase().replace(/️/g, "\u0000");
  // 비교용 글자 → 원문 위치
  const map: number[] = [];
  let compact = "";
  for (let i = 0; i < lower.length; i++) {
    if (/[-_\s\u0000]/.test(lower[i])) continue;
    map.push(i);
    compact += lower[i];
  }
  const ranges: [number, number][] = [];
  for (const word of words) {
    const w = word.normalize("NFKC").toLowerCase();
    if (!w) continue;
    for (let at = lower.indexOf(w); at >= 0; at = lower.indexOf(w, at + 1)) ranges.push([at, at + w.length]);
    const cw = compactOf(w);
    if (!cw || EMOJI_ONLY.test(cw)) continue;
    for (let at = compact.indexOf(cw); at >= 0; at = compact.indexOf(cw, at + 1)) {
      ranges.push([map[at], map[at + cw.length - 1] + 1]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}
