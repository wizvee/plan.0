/**
 * 메모 안 할 일 링크 — 옵시디언 내부 링크 `[[이름(10/1)]]` (LINKS-PLAN.md).
 * 링크 글자는 할 일 이름 + 날짜(M/d)이고, 그 이름 · 날짜인 할 일을 찾아 연결한다. DB 변경 없음 — 메모 원문 그대로.
 *
 *   `- [[`RESP_DIV_TAB` 회의(10/1)]]에서 옮김`   "나중에"가 남기는 줄(이름이 매일 반복될 수 있어 날짜까지)
 *   `[[이름]]` · `[[이름|보이는 글자]]`          메모에 직접 친 링크
 *   `회의(10/1)에서 옮김`                        예전 "나중에" 줄 — 원문은 그대로 두고 찾아지면 링크로 보여준다
 */
import { format, parseISO } from "date-fns";

import { parseMemoLine } from "@/lib/memo-marks";
import type { Todo } from "@/lib/types";

/** `[[대상]]` · `[[대상|보이는 글자]]` — 줄바꿈 · 대괄호는 넘지 않는다 */
const WIKI_LINK = /\[\[([^[\]\n]+)\]\]/g;
/** 대상 끝의 `(M/d)` — 할 일 날짜 */
const DATED_TARGET = /^(.*)\((\d{1,2})\/(\d{1,2})\)$/;
/** "나중에"가 남기는 줄(표시 · 불릿을 뺀 글자) */
const MOVED_WIKI = /^\[\[([^[\]\n]+)\]\]에서 옮김$/;
/** 예전 "나중에" 줄 — `[[ ]]` 없이 `L사 업무(9/30)에서 옮김` */
const MOVED_LEGACY = /^([^[\]\n]+)에서 옮김$/;

/** 이 할 일을 가리키는 링크 대상 글자 — `이름(10/1)`, 날짜가 없으면 `이름` */
export function linkTargetOf(todo: Pick<Todo, "content" | "scheduledDate">): string {
  return todo.scheduledDate ? `${todo.content}(${format(parseISO(todo.scheduledDate), "M/d")})` : todo.content;
}

/** "나중에" 메모 줄 — `- [[이름(10/1)]]에서 옮김` */
export function movedFromLine(source: Pick<Todo, "content" | "scheduledDate">): string {
  return `- [[${linkTargetOf(source)}]]에서 옮김`;
}

/** `대상|보이는 글자` → 대상 · 보이는 글자 */
function splitAlias(inner: string): { target: string; label: string } {
  const at = inner.indexOf("|");
  if (at < 0) return { target: inner.trim(), label: inner.trim() };
  return { target: inner.slice(0, at).trim(), label: inner.slice(at + 1).trim() || inner.slice(0, at).trim() };
}

/**
 * 후보가 여럿이면(같은 이름 · 같은 M/d가 다른 해에 있거나 날짜 없는 같은 이름) 링크를 쓴 할 일이 만들어진 날 이전에서
 * 가장 가까운 것, 없으면 그 뒤로 가장 가까운 것.
 */
function pickNearest(candidates: Todo[], from: Todo | null | undefined): Todo {
  if (candidates.length === 1) return candidates[0];
  const ref = (from?.createdAt ?? new Date().toISOString()).slice(0, 10);
  const day = (t: Todo) => t.scheduledDate ?? t.createdAt.slice(0, 10);
  const before = candidates.filter((t) => day(t) <= ref).sort((a, b) => day(b).localeCompare(day(a)));
  if (before.length > 0) return before[0];
  return candidates.slice().sort((a, b) => day(a).localeCompare(day(b)))[0];
}

/**
 * 링크 대상 글자로 할 일을 찾는다. `이름(M/d)`면 그 이름 · 그 날짜(월/일)인 할 일, 없으면 `(M/d)`까지 이름으로 다시 찾는다.
 * 날짜 없는 `이름`이면 날짜 없는 같은 이름 먼저. 링크를 쓴 할 일 자신(`from`)은 빼고, 못 찾으면 null.
 */
export function resolveLink(target: string, todos: Todo[], from?: Todo | null): Todo | null {
  const named = (name: string) => todos.filter((t) => t.id !== from?.id && t.content.trim() === name);
  const dated = DATED_TARGET.exec(target);
  if (dated) {
    const month = Number(dated[2]);
    const day = Number(dated[3]);
    const sameDay = named(dated[1].trim()).filter((t) => {
      if (!t.scheduledDate) return false;
      const date = parseISO(t.scheduledDate);
      return date.getMonth() + 1 === month && date.getDate() === day;
    });
    if (sameDay.length > 0) return pickNearest(sameDay, from);
  }
  const byName = named(target.trim());
  if (byName.length === 0) return null;
  const undated = byName.filter((t) => !t.scheduledDate);
  return pickNearest(undated.length > 0 ? undated : byName, from);
}

export type LinkPart =
  | { kind: "text"; text: string }
  /** `legacy` = 예전 "…에서 옮김" 줄 — 못 찾으면 끊긴 링크가 아니라 보통 글자로 보인다 */
  | { kind: "link"; target: string; label: string; legacy: boolean };

/** 한 줄 글자(표시 · 불릿을 뺀 것)를 글자 · 링크 조각으로 나눈다. `legacy`면 예전 "…에서 옮김" 줄도 링크로 읽는다. */
export function splitLinks(text: string, { legacy = false }: { legacy?: boolean } = {}): LinkPart[] {
  if (!text.includes("[[")) {
    const old = legacy ? MOVED_LEGACY.exec(text) : null;
    if (old) {
      const target = old[1].trim();
      return [
        { kind: "link", target, label: target, legacy: true },
        { kind: "text", text: "에서 옮김" },
      ];
    }
    return [{ kind: "text", text }];
  }
  const parts: LinkPart[] = [];
  let last = 0;
  for (const match of text.matchAll(WIKI_LINK)) {
    if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
    const { target, label } = splitAlias(match[1]);
    parts.push(target ? { kind: "link", target, label, legacy: false } : { kind: "text", text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/** 링크 괄호를 뗀 글자 — 검색 결과처럼 링크를 그리지 않는 곳에서 `[[이름(10/1)]]` 대신 `이름(10/1)`으로 */
export function stripLinks(text: string): string {
  return text.includes("[[") ? text.replace(WIKI_LINK, (_, inner: string) => splitAlias(inner).label) : text;
}

/** 메모에 링크(또는 예전 "…에서 옮김" 줄)가 있는지 — 있으면 상세 팝업이 보기 모드(`MemoView`)로 그린다 */
export function hasMemoLinks(memo: string | null | undefined): boolean {
  if (!memo) return false;
  if (memo.includes("[[")) return true;
  return memo.split("\n").some((raw) => {
    const line = parseMemoLine(raw);
    return line.state === null && MOVED_LEGACY.test(line.text);
  });
}

/** 메모가 말하는 "어디서 옮겼는지" — 표시 없는 `[[대상]]에서 옮김`(또는 예전 줄)의 대상. 없으면 null */
function movedTargetOf(memo: string | null): string | null {
  if (!memo || !memo.includes("에서 옮김")) return null;
  for (const raw of memo.split("\n")) {
    const line = parseMemoLine(raw);
    if (line.state !== null) continue;
    const text = line.text.trim();
    const wiki = MOVED_WIKI.exec(text);
    if (wiki) return splitAlias(wiki[1]).target;
    const old = MOVED_LEGACY.exec(text);
    if (old) return old[1].trim();
  }
  return null;
}

/**
 * 이 할 일에서 "나중에"로 옮겨 간 할 일들(역링크) — 메모의 "…에서 옮김" 줄이 이 할 일을 가리키는 것.
 * 하위 할 일에서 지워져도 원래 할 일에서 무엇이 나갔는지 보이게(상세 팝업 하위 할 일 탭 아래). 만든 순서.
 */
export function movedTodosOf(source: Todo, todos: Todo[]): Todo[] {
  return todos
    .filter((t) => {
      if (t.id === source.id) return false;
      const target = movedTargetOf(t.memo);
      return target !== null && resolveLink(target, todos, t)?.id === source.id;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * 할 일 이름 · 날짜가 바뀌면 그 할 일을 가리키던 다른 메모의 링크도 새 대상으로 고친다(옵시디언처럼).
 * `todos`는 바뀌기 전 목록. 고칠 메모만 `{ id, memo }`로 돌려준다. 예전 "…에서 옮김" 줄은 그 모양 그대로 이름만 바꾼다.
 */
export function retargetLinks(todos: Todo[], before: Todo, after: Pick<Todo, "content" | "scheduledDate">) {
  const oldTarget = linkTargetOf(before);
  const newTarget = linkTargetOf(after);
  if (oldTarget === newTarget) return [];
  const name = before.content.trim();

  const changes: { id: string; memo: string }[] = [];
  for (const todo of todos) {
    if (todo.id === before.id || !todo.memo || !todo.memo.includes(name)) continue;
    const pointsHere = (target: string) => resolveLink(target, todos, todo)?.id === before.id;
    const next = todo.memo
      .split("\n")
      .map((raw) => {
        const line = parseMemoLine(raw);
        if (line.state === null && !raw.includes("[[")) {
          const old = MOVED_LEGACY.exec(line.text.trim());
          if (old && pointsHere(old[1].trim())) {
            return `${raw.slice(0, raw.length - line.text.length)}${newTarget}에서 옮김`;
          }
          return raw;
        }
        return raw.replace(WIKI_LINK, (whole, inner: string) => {
          const at = inner.indexOf("|");
          const target = (at < 0 ? inner : inner.slice(0, at)).trim();
          if (!pointsHere(target)) return whole;
          return `[[${newTarget}${at < 0 ? "" : inner.slice(at)}]]`;
        });
      })
      .join("\n");
    if (next !== todo.memo) changes.push({ id: todo.id, memo: next });
  }
  return changes;
}
