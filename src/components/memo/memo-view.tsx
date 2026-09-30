"use client";

import { useRef, useState } from "react";
import { Check, QuestionMark } from "@/components/icons";

import { cn } from "@/lib/utils";
import { InlineText } from "@/components/inline-text";
import { MARK_META } from "@/components/memo/mark-meta";
import {
  parseMemoLines,
  reopenQuestion,
  resolveQuestion,
  splitAnswer,
  toggleDone,
  type MemoLine,
} from "@/lib/memo-marks";

/** 표시 칸 — 체크박스와 같은 18px 둥근 사각형(모서리 5px) */
const MARK_BOX = "mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[5px]";

/**
 * 알게 된 것(`[i]`)의 원 없는 `i` — Phosphor에는 원 안 Info만 있어서(칸 안에 원이 겹치면 지저분함, MEMO-MARKS-PLAN.md 4번)
 * 같은 256 그리드 · bold 굵기로 여기서만 그린다.
 */
function InfoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" className={className} aria-hidden="true">
      <path d="M128 100a16 16 0 0 1 16 16v80a16 16 0 0 1-32 0v-80a16 16 0 0 1 16-16Zm0-60a20 20 0 1 1 0 40a20 20 0 0 1 0-40Z" />
    </svg>
  );
}

/**
 * 메모 보기 모드 — 줄 앞 표시를 아이콘으로 그리고, 누르면 상태가 바뀐다 (MEMO-MARKS-PLAN.md 4번).
 * 확인 체크박스 `[ ]` ↔ `[x]`, 질문 `?` → 답 입력칸(Enter/포커스 해제 시 `[i]` + `→ 답`), `i` → `[?]`로 되돌리기.
 * 회고 3종은 아이콘만. 줄(아이콘 밖)을 누르면 `onEdit(줄 번호)`로 원문 편집에 들어간다.
 */
export function MemoView({
  text,
  onChange,
  onEdit,
  className,
}: {
  text: string;
  onChange: (next: string) => void;
  onEdit: (lineIndex: number | null) => void;
  className?: string;
}) {
  const [resolving, setResolving] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  // Esc로 취소하면 입력칸이 사라지며 blur가 올 수 있다 — 그때 저장하지 않게
  const cancelled = useRef(false);
  const lines = parseMemoLines(text);

  function finishResolve(index: number) {
    if (cancelled.current) return;
    onChange(resolveQuestion(text, index, answer));
    setResolving(null);
    setAnswer("");
  }

  return (
    <div
      role="group"
      aria-label="메모 — 줄을 누르면 수정"
      tabIndex={0}
      onClick={() => onEdit(null)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onEdit(null);
        }
      }}
      className={cn("flex cursor-text flex-col text-[14.5px] leading-[1.45] outline-none", className)}
    >
      {lines.map((line, index) =>
        line.raw.trim() === "" ? (
          <div key={index} className="h-2.5 shrink-0" />
        ) : (
          <MemoLineRow
            key={index}
            line={line}
            resolving={resolving === index}
            answer={answer}
            onAnswerChange={setAnswer}
            onToggleDone={() => onChange(toggleDone(text, index))}
            onStartResolve={() => {
              cancelled.current = false;
              setAnswer("");
              setResolving(index);
            }}
            onFinishResolve={() => finishResolve(index)}
            onCancelResolve={() => {
              cancelled.current = true;
              setResolving(null);
            }}
            onReopen={() => onChange(reopenQuestion(text, index))}
            onEdit={() => onEdit(index)}
          />
        )
      )}
    </div>
  );
}

function MemoLineRow({
  line,
  resolving,
  answer,
  onAnswerChange,
  onToggleDone,
  onStartResolve,
  onFinishResolve,
  onCancelResolve,
  onReopen,
  onEdit,
}: {
  line: MemoLine;
  resolving: boolean;
  answer: string;
  onAnswerChange: (value: string) => void;
  onToggleDone: () => void;
  onStartResolve: () => void;
  onFinishResolve: () => void;
  onCancelResolve: () => void;
  onReopen: () => void;
  onEdit: () => void;
}) {
  // 들여쓰기 두 칸 = 한 단계(표시 칸 + 간격만큼), 너무 깊어지지 않게 4단계까지
  const depth = Math.min(Math.floor(line.indent.replace(/\t/g, "  ").length / 2), 4);
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const { question, answer: savedAnswer } =
    line.kind === "question" ? splitAnswer(line.text) : { question: line.text, answer: null };
  // 답 입력 중인 질문은 이미 알게 된 것(i) 모양으로 보인다(시안 ③)
  const showInfo = line.state === "i" || resolving;

  let mark: React.ReactNode;
  if (line.kind === "check") {
    mark = (
      <button
        type="button"
        onClick={stop(onToggleDone)}
        aria-label={line.done ? "확인함 — 누르면 되돌리기" : "확인 필요 — 누르면 체크"}
        aria-pressed={line.done}
        className={cn(
          MARK_BOX,
          line.done ? "bg-primary text-primary-foreground" : "border-[1.6px] border-muted-foreground/60 bg-card"
        )}
      >
        {line.done ? <Check weight="bold" className="size-3" aria-hidden="true" /> : null}
      </button>
    );
  } else if (line.kind === "question") {
    mark = (
      <button
        type="button"
        onClick={stop(showInfo ? (resolving ? onCancelResolve : onReopen) : onStartResolve)}
        aria-label={showInfo ? "알게 된 것 — 누르면 질문으로 되돌리기" : "질문 — 누르면 해결"}
        className={MARK_BOX}
        style={
          showInfo
            ? { backgroundColor: "var(--mark-info-tint)", color: "var(--mark-info)" }
            : { backgroundColor: "var(--mark-question-tint)", color: "var(--mark-question)" }
        }
      >
        {showInfo ? (
          <InfoGlyph className="size-3" />
        ) : (
          <QuestionMark weight="bold" className="size-3" aria-hidden="true" />
        )}
      </button>
    );
  } else if (line.kind) {
    const meta = MARK_META[line.kind];
    const Icon = meta.icon;
    mark = (
      <span role="img" aria-label={meta.label} className={MARK_BOX} style={{ backgroundColor: meta.tint, color: meta.color }}>
        <Icon weight="bold" className="size-3" aria-hidden="true" />
      </span>
    );
  } else if (line.bullet && /^\d/.test(line.bullet)) {
    mark = (
      <span className="w-[18px] shrink-0 text-right text-[12.5px] tabular-nums text-muted-foreground">{line.bullet}</span>
    );
  } else {
    // 보통 줄 — 불릿이 있으면 작은 회색 점, 없으면 빈 칸(글자 줄을 맞추려고)
    mark = (
      <span className="flex h-[21px] w-[18px] shrink-0 items-center justify-center" aria-hidden="true">
        {line.bullet ? <span className="size-1 rounded-full bg-muted-foreground/40" /> : null}
      </span>
    );
  }

  const checked = line.kind === "check" && line.done;
  const row = (
    <div
      onClick={stop(onEdit)}
      className="flex min-h-[26px] shrink-0 items-start gap-[9px] py-[3px]"
      style={depth ? { paddingLeft: depth * 27 } : undefined}
    >
      {mark}
      <span
        className={cn(
          "min-w-0 flex-1 whitespace-pre-wrap break-words",
          checked && "text-muted-foreground line-through"
        )}
      >
        <InlineText text={question} />
        {savedAnswer !== null ? (
          <span className="text-muted-foreground">
            {"  → "}
            <InlineText text={savedAnswer} />
          </span>
        ) : null}
      </span>
    </div>
  );

  if (!resolving) return row;

  // 질문 해결 — 줄 아래 답 입력칸(시안 ③). Enter · 포커스 해제 = 저장(비우면 표시만 바뀜), Esc = 취소
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="-mx-2 flex shrink-0 flex-col gap-1.5 rounded-lg bg-black/[0.03] px-2 py-1.5"
    >
      {row}
      <label
        className="flex h-8 items-center gap-1.5 rounded-[7px] bg-card px-2.5 shadow-[0_0_0_1.5px_var(--primary),0_0_0_4px_color-mix(in_srgb,var(--primary)_15%,transparent)]"
        style={{ marginLeft: depth * 27 + 27 }}
      >
        <span className="text-[14px] text-muted-foreground" aria-hidden="true">
          →
        </span>
        <input
          autoFocus
          type="text"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              // 모달까지 닫히지 않게 (모달은 defaultPrevented면 무시)
              e.preventDefault();
              onCancelResolve();
            }
          }}
          onBlur={onFinishResolve}
          placeholder="답을 적어두세요 (Enter · 비워도 돼요)"
          aria-label="답"
          className="min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
        />
      </label>
    </div>
  );
}
