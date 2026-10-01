"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowRight, BookmarkSimple, CaretRight, Check, Compass, LinkSimple, Note, QuestionMark, Target } from "@/components/icons";

import { cn } from "@/lib/utils";
import { INLINE_CODE_CLASS, splitInlineCode } from "@/components/inline-text";
import { MARK_BOX, InfoGlyph, MarkIcon } from "@/components/memo/memo-view";
import { parseMemoLine, reopenQuestion, resolveQuestion, splitAnswer, toggleDone } from "@/lib/memo-marks";
import { stripLinks } from "@/lib/memo-links";
import {
  highlightRanges,
  splitMemoMark,
  type LineHit,
  type MatchedLine,
  type ParaHit,
  type SearchPara,
  type TodoHit,
} from "@/lib/search";
import type { ParaKind, Subtask, Todo } from "@/lib/types";
import { useParaColor } from "@/lib/app-data/use-para-color";

const KIND_ICON: Record<ParaKind, typeof Target> = { project: Target, area: Compass, resource: BookmarkSimple };
const KIND_LABEL: Record<ParaKind, string> = { project: "프로젝트", area: "영역", resource: "리소스" };

/** 결과 카드 공통 — 선택(↑↓)되면 파란 2px 테두리 (시안 ②) */
const CARD =
  "block w-full cursor-pointer rounded-[10px] bg-card px-3.5 py-3 text-left shadow-[0_0_0_1px_var(--border)] outline-none transition-shadow hover:bg-black/[0.02]";
const CARD_SELECTED = "shadow-[0_0_0_2px_var(--primary)] bg-primary/[0.03] hover:bg-primary/[0.03]";

// ---------- 글자 ----------

function markPieces(text: string, words: string[]): ReactNode {
  const ranges = highlightRanges(text, words);
  if (ranges.length === 0) return text;
  const out: ReactNode[] = [];
  let last = 0;
  for (const [start, end] of ranges) {
    if (start > last) out.push(<Fragment key={`t${last}`}>{text.slice(last, start)}</Fragment>);
    out.push(
      <mark key={`m${start}`} className="rounded-[3px] bg-warning/25 px-px text-inherit">
        {text.slice(start, end)}
      </mark>
    );
    last = end;
  }
  if (last < text.length) out.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  return out;
}

/** 검색 단어를 옅은 주황 배경으로 표시한 사용자 텍스트 — 백틱 인라인 코드도 `InlineText`처럼 그린다. */
export function HighlightText({ text, words }: { text: string; words: string[] }) {
  return splitInlineCode(text).map((part, i) =>
    part.code ? (
      <code key={i} className={INLINE_CODE_CLASS}>
        {markPieces(part.text, words)}
      </code>
    ) : (
      <Fragment key={i}>{markPieces(part.text, words)}</Fragment>
    )
  );
}

// ---------- 맥락 줄 ----------

/** "9월 29일 (화)" — 올해가 아니면 연도, 캘린더에 없으면 "날짜 없음" */
export function resultDateLabel(todo: Todo): string {
  if (!todo.scheduledDate) return "날짜 없음";
  const date = parseISO(todo.scheduledDate);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return format(date, sameYear ? "M월 d일 (EEE)" : "yyyy년 M월 d일 (EEE)", { locale: ko });
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ParaLabel({ para, words }: { para: SearchPara; words: string[] }) {
  const color = useParaColor().ofContainer(para.kind, para.id).color;
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">
        <HighlightText text={para.name} words={words} />
      </span>
    </span>
  );
}

function ContextRow({ parts, source }: { parts: ReactNode[]; source: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-muted-foreground">
        {parts.map((part, i) => (
          <Fragment key={i}>
            {i > 0 ? <span className="text-black/20">·</span> : null}
            {part}
          </Fragment>
        ))}
      </span>
      <span className="shrink-0 rounded-[5px] bg-black/[0.05] px-1.5 py-px text-[11.5px] font-semibold text-muted-foreground">
        {source}
      </span>
    </div>
  );
}

// ---------- 할 일 카드 ----------

/** 할 일 · 하위 할 일의 작은 원형 체크(누를 수 없음) — 완료 = 채운 원, 넘김 = 회색 화살표 */
function StatusDot({ color, completed, carried }: { color: string; completed: boolean; carried?: boolean }) {
  if (carried) {
    return (
      <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-full bg-black/[0.08] text-muted-foreground">
        <ArrowRight weight="bold" className="size-2.5" aria-label="넘김" />
      </span>
    );
  }
  return (
    <span
      className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-full border-[1.6px] text-white"
      style={{ borderColor: color, backgroundColor: completed ? color : undefined }}
      aria-label={completed ? "완료" : "안 함"}
    >
      {completed ? <Check weight="bold" className="size-2.5" aria-hidden="true" /> : null}
    </span>
  );
}

function SubtaskLine({ match, color, words }: { match: MatchedLine; color: string; words: string[] }) {
  const subtask = match.line.subtask as Subtask;
  const { done, memo } = splitMemoMark(subtask.content);
  const carried = subtask.carriedAt !== null;
  return (
    <div className="flex items-start gap-[9px]">
      <StatusDot color={color} completed={subtask.completed} carried={carried} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "break-words text-[14px] leading-[1.45]",
            subtask.completed && "text-muted-foreground line-through",
            carried && "text-muted-foreground"
          )}
        >
          <HighlightText text={done} words={words} />
        </div>
        {/* 📝 뒤 = 찾던 답 — 크게 (SEARCH-PLAN.md 3-5) */}
        {memo ? (
          <div className="mt-0.5 break-words text-[17px] font-semibold leading-snug tracking-[-0.2px]">
            <HighlightText text={memo} words={words} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 질문 줄의 `→ 답`. 알게 된 것(`[i]`)의 답은 찾던 내용이라 진하게(하위 할 일 📝 뒤와 같은 역할),
 * 다시 질문으로 되돌린 줄(`[?]`)에 남은 답은 흐리게.
 */
function AnswerPart({ answer, known, words }: { answer: string; known: boolean; words: string[] }) {
  return (
    <>
      <span className="font-normal text-muted-foreground">{"  → "}</span>
      <span className={known ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}>
        <HighlightText text={answer} words={words} />
      </span>
    </>
  );
}

function MemoSnippetBlock({ hit, words }: { hit: TodoHit; words: string[] }) {
  return (
    <div className="mt-2 flex flex-col gap-[3px] rounded-lg bg-muted px-2.5 py-2">
      {hit.memo!.map((line, i) => {
        if (!line) {
          return (
            <span key={`gap${i}`} className="pl-[23px] text-[12px] leading-none text-muted-foreground" aria-label="줄 생략">
              ⋯
            </span>
          );
        }
        const parsed = parseMemoLine(line.raw);
        const checked = parsed.state === "x";
        const { question, answer } = parsed.kind === "question" ? splitAnswer(parsed.text) : { question: parsed.text, answer: null };
        return (
          <div
            key={line.lineIndex}
            className={cn(
              "flex items-start gap-[7px] text-[13.5px] leading-[1.45]",
              line.best ? "font-semibold text-foreground" : "text-foreground/80"
            )}
          >
            {parsed.state ? (
              <MarkIcon state={parsed.state} className="size-4 rounded-[4px]" />
            ) : (
              <span className="flex h-[19px] w-4 shrink-0 items-center justify-center" aria-hidden="true">
                {parsed.bullet ? <span className="size-1 rounded-full bg-muted-foreground/40" /> : null}
              </span>
            )}
            <span className={cn("min-w-0 flex-1 break-words", checked && "text-muted-foreground line-through")}>
              <HighlightText text={stripLinks(question)} words={words} />
              {answer !== null ? <AnswerPart answer={answer} known={parsed.state === "i"} words={words} /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const SOURCE_LABEL = { subtask: "하위 할 일", memo: "메모", url: "URL" } as const;

/** 할 일 하나 = 카드 하나. 일치한 하위 할 일 · 메모 스니펫 · URL을 모아 보여준다 (시안 ② ③). */
export function TodoResultCard({
  hit,
  words,
  selected,
  id,
  onOpen,
  onHover,
}: {
  hit: TodoHit;
  words: string[];
  selected: boolean;
  id: string;
  onOpen: () => void;
  onHover: () => void;
}) {
  const { todo } = hit;
  const color = useParaColor().ofMapping(todo).color;
  // 하위 할 일로 찾았으면 하위 할 일이 주인공 — 부모 할 일 이름은 맥락 줄로
  const subtaskFirst = hit.bestSource === "subtask";
  const context: ReactNode[] = [resultDateLabel(todo)];
  if (subtaskFirst) context.push(<HighlightText key="parent" text={todo.content} words={words} />);
  if (hit.para) context.push(<ParaLabel key="para" para={hit.para} words={words} />);
  if (todo.url) {
    context.push(
      <span key="url" className="inline-flex items-center gap-[3px]">
        <LinkSimple weight="bold" className="size-3" aria-hidden="true" />
        {domainOf(todo.url)}
      </span>
    );
  }
  const source = hit.bestSource === "title" ? (todo.kind === "note" ? "노트" : "할 일") : SOURCE_LABEL[hit.bestSource];

  const header = subtaskFirst ? null : (
    <div className="flex items-start gap-[9px]">
      {todo.kind === "task" ? (
        <StatusDot color={color} completed={todo.completed} />
      ) : (
        <Note weight="bold" className="mt-[3px] size-4 shrink-0 text-muted-foreground" aria-label="노트" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 break-words text-[15px] font-semibold leading-[1.4]",
          todo.kind === "task" && todo.completed && "text-muted-foreground line-through"
        )}
      >
        <HighlightText text={todo.content} words={words} />
      </span>
    </div>
  );

  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onOpen}
      onMouseMove={onHover}
      className={cn(CARD, selected && CARD_SELECTED)}
    >
      {header}
      {/* 가장 잘 맞은 쪽을 먼저 — 메모로 찾았으면 메모 스니펫이 하위 할 일보다 위 */}
      {hit.bestSource === "memo" && hit.memo ? <MemoSnippetBlock hit={hit} words={words} /> : null}
      {hit.subtasks.length > 0 ? (
        <div className={cn("flex flex-col gap-2", (header || hit.bestSource === "memo") && "mt-2")}>
          {hit.subtasks.map((m) => (
            <SubtaskLine key={m.line.subtask!.id} match={m} color={color} words={words} />
          ))}
        </div>
      ) : null}
      {hit.bestSource !== "memo" && hit.memo ? <MemoSnippetBlock hit={hit} words={words} /> : null}
      {hit.urlMatched && todo.url ? (
        <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <LinkSimple weight="bold" className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">
            <HighlightText text={todo.url} words={words} />
          </span>
        </div>
      ) : null}
      <ContextRow parts={context} source={source} />
    </div>
  );
}

/** PARA 이름이 걸린 결과 — 그 상세 화면으로 가는 바로 가기 (시안 ③) */
export function ParaResultCard({
  hit,
  words,
  selected,
  id,
  onOpen,
  onHover,
}: {
  hit: ParaHit;
  words: string[];
  selected: boolean;
  id: string;
  onOpen: () => void;
  onHover: () => void;
}) {
  const Icon = KIND_ICON[hit.kind];
  const { color, tint } = useParaColor().ofContainer(hit.kind, hit.id);
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onOpen}
      onMouseMove={onHover}
      className={cn(CARD, "py-2.5", selected && CARD_SELECTED)}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-[30px] shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint, color }}
        >
          <Icon weight="bold" className="size-[17px]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[15px] font-semibold">
            <HighlightText text={hit.name} words={words} />
          </span>
          <span className="text-[12px] text-muted-foreground">
            {KIND_LABEL[hit.kind]}
            {hit.closed ? (hit.kind === "project" ? " · 완료" : " · 보관됨") : null}
          </span>
        </span>
        <CaretRight weight="bold" className="size-3.5 shrink-0 text-black/25" aria-hidden="true" />
      </div>
    </div>
  );
}

// ---------- 줄 모드 ----------

/** 이모지만 검색 — 날짜 · 줄 · 맥락의 평평한 목록 (시안 ④). `📝` 뒤는 굵게. */
export function EmojiLineRow({
  hit,
  words,
  selected,
  id,
  first,
  onOpen,
  onHover,
}: {
  hit: LineHit;
  words: string[];
  selected: boolean;
  id: string;
  first: boolean;
  onOpen: () => void;
  onHover: () => void;
}) {
  const { done, memo } = splitMemoMark(hit.text);
  const date = hit.todo.scheduledDate ? format(parseISO(hit.todo.scheduledDate), "M/d") : "–";
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onOpen}
      onMouseMove={onHover}
      className={cn(
        "flex cursor-pointer items-start gap-3 px-3.5 py-2.5",
        !first && "border-t border-border",
        selected ? "bg-primary/[0.06]" : "hover:bg-black/[0.02]"
      )}
    >
      <span className="w-[34px] shrink-0 pt-0.5 text-[12.5px] tabular-nums text-muted-foreground">{date}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="break-words text-[14px] leading-[1.45]">
          <HighlightText text={done} words={words} />
          {memo !== null ? (
            <>
              {" "}
              <mark className="rounded-[3px] bg-warning/25 px-px text-inherit">📝</mark>{" "}
              <span className="font-semibold">
                <HighlightText text={memo} words={words} />
              </span>
            </>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
          {hit.source !== "title" ? <HighlightText text={hit.todo.content} words={words} /> : null}
          {hit.source !== "title" && hit.para ? <span className="text-black/20">·</span> : null}
          {hit.para ? <ParaLabel para={hit.para} words={words} /> : null}
        </span>
      </span>
    </div>
  );
}

/**
 * 줄 표시 모아보기의 한 줄 (MEMO-MARKS-PLAN.md 5번) — 표시 칸에서 바로 체크 · 해결(답 입력) · 되돌리기.
 * 줄 글자를 누르면 그 할 일을 연다.
 */
export function MarkLineRow({
  hit,
  words,
  selected,
  id,
  first,
  onOpen,
  onHover,
  onEditMemo,
}: {
  hit: LineHit;
  words: string[];
  selected: boolean;
  id: string;
  first: boolean;
  onOpen: () => void;
  onHover: () => void;
  onEditMemo: (todo: Todo, memo: string) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [answer, setAnswer] = useState("");
  const cancelled = useRef(false);
  const memo = hit.todo.memo ?? "";
  const lineIndex = hit.lineIndex!;
  const state = hit.mark!;
  const { question, answer: saved } = state === "?" || state === "i" ? splitAnswer(hit.text) : { question: hit.text, answer: null };
  const showInfo = state === "i" || resolving;

  function finish() {
    if (cancelled.current) return;
    onEditMemo(hit.todo, resolveQuestion(memo, lineIndex, answer));
    setResolving(false);
    setAnswer("");
  }

  let mark: ReactNode;
  if (state === " " || state === "x") {
    mark = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEditMemo(hit.todo, toggleDone(memo, lineIndex));
        }}
        aria-label={state === "x" ? "확인함 — 누르면 되돌리기" : "확인 필요 — 누르면 체크"}
        aria-pressed={state === "x"}
        className={cn(
          MARK_BOX,
          state === "x" ? "bg-primary text-primary-foreground" : "border-[1.6px] border-muted-foreground/60 bg-card"
        )}
      >
        {state === "x" ? <Check weight="bold" className="size-3" aria-hidden="true" /> : null}
      </button>
    );
  } else if (state === "?" || state === "i") {
    mark = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (resolving) {
            cancelled.current = true;
            setResolving(false);
          } else if (state === "i") {
            onEditMemo(hit.todo, reopenQuestion(memo, lineIndex));
          } else {
            cancelled.current = false;
            setAnswer("");
            setResolving(true);
          }
        }}
        aria-label={showInfo ? "알게 된 것 — 누르면 질문으로 되돌리기" : "질문 — 누르면 해결"}
        className={MARK_BOX}
        style={
          showInfo
            ? { backgroundColor: "var(--mark-info-tint)", color: "var(--mark-info)" }
            : { backgroundColor: "var(--mark-question-tint)", color: "var(--mark-question)" }
        }
      >
        {showInfo ? <InfoGlyph className="size-3" /> : <QuestionMark weight="bold" className="size-3" aria-hidden="true" />}
      </button>
    );
  } else {
    mark = <MarkIcon state={state} />;
  }

  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onOpen}
      onMouseMove={onHover}
      className={cn(
        "flex cursor-pointer flex-col gap-1.5 px-3 py-[9px]",
        !first && "border-t border-border",
        selected ? "bg-primary/[0.06]" : "hover:bg-black/[0.02]"
      )}
    >
      <div className="flex items-start gap-2.5">
        {mark}
        <span
          className={cn(
            "min-w-0 flex-1 break-words text-[14px] leading-[1.45]",
            state === "x" && "text-muted-foreground line-through"
          )}
        >
          <HighlightText text={stripLinks(question)} words={words} />
          {saved !== null ? <AnswerPart answer={saved} known={state === "i"} words={words} /> : null}
        </span>
        <CaretRight weight="bold" className="mt-[3px] size-3.5 shrink-0 text-black/25" aria-hidden="true" />
      </div>
      {resolving ? (
        // 답 입력 — Enter · 포커스 해제 = 저장(비우면 표시만 [i]), Esc = 취소 (메모 보기 모드와 같음)
        <label
          onClick={(e) => e.stopPropagation()}
          className="ml-7 flex h-8 items-center gap-1.5 rounded-[7px] bg-card px-2.5 shadow-[0_0_0_1.5px_var(--primary),0_0_0_4px_color-mix(in_srgb,var(--primary)_15%,transparent)]"
        >
          <span className="text-[14px] text-muted-foreground" aria-hidden="true">
            →
          </span>
          <input
            autoFocus
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelled.current = true;
                setResolving(false);
              }
            }}
            onBlur={finish}
            placeholder="답을 적어두세요 (Enter · 비워도 돼요)"
            aria-label="답"
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </label>
      ) : null}
    </div>
  );
}

/** 줄 모드 묶음 머리 — 할 일 이름 · 날짜 · PARA (메모 줄 표시 시안 ④⑤) */
export function LineGroupHeader({ todo, para, words }: { todo: Todo; para: SearchPara | null; words: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 px-1 pb-1.5 pt-3 text-[12px] text-muted-foreground">
      <span className="font-semibold text-foreground">
        <HighlightText text={todo.content} words={words} />
      </span>
      <span className="text-black/20">·</span>
      <span>{resultDateLabel(todo)}</span>
      {para ? (
        <>
          <span className="text-black/20">·</span>
          <ParaLabel para={para} words={words} />
        </>
      ) : null}
    </div>
  );
}
