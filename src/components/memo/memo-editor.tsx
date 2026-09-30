"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { applyMark, commonKind, continueOnEnter, lineRangeAt, type MarkKind } from "@/lib/memo-marks";
import { MemoToolbar } from "@/components/memo/memo-toolbar";

/**
 * 메모 원문 편집 — 줄 표시 툴바 + 입력칸 (MEMO-MARKS-PLAN.md 3번).
 * - 툴바: 커서가 있는 줄(여러 줄 선택이면 전부)에 표시를 붙이고 · 바꾸고 · 뗀다.
 * - Enter: 표시가 있는 줄 끝에서 누르면 다음 줄도 같은 표시로, 표시만 있는 빈 줄이면 표시를 뗀다.
 * 글자는 `execCommand("insertText")`로 넣어 브라우저 되돌리기(⌘Z)가 그대로 된다.
 * 입력칸에서 포커스가 빠지면(툴바를 누르는 중은 빼고) `onCommit`.
 */
export function MemoEditor({
  value,
  onChange,
  onCommit,
  caretLine,
  className,
  textareaClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  /** 보기 모드에서 누른 줄 — 그 줄 끝에 커서를 둔다. null이면 메모 끝 */
  caretLine: number | null;
  className?: string;
  textareaClassName?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const pressingToolbar = useRef(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // 열릴 때 누른 줄 끝(없으면 맨 끝)에 커서
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value;
    let offset = text.length;
    if (caretLine !== null) {
      const lines = text.split("\n").slice(0, caretLine + 1);
      offset = Math.min(lines.join("\n").length, text.length);
    }
    textarea.focus();
    textarea.setSelectionRange(offset, offset);
    setSelection({ start: offset, end: offset });
    // 열릴 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncSelection() {
    const textarea = textareaRef.current;
    if (textarea) setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
  }

  /** start~end를 text로 바꾸고 선택 영역을 selStart~selEnd로 */
  function replaceRange(start: number, end: number, text: string, selStart: number, selEnd: number) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    const inserted = text
      ? document.execCommand("insertText", false, text)
      : start === end || document.execCommand("delete");
    if (!inserted) {
      textarea.setRangeText(text, start, end);
      onChange(textarea.value);
    }
    textarea.setSelectionRange(selStart, selEnd);
    syncSelection();
  }

  /** 선택 영역이 걸친 줄들의 [시작, 끝] 위치. 다음 줄 맨 앞에서 끝나는 선택(줄 전체 드래그)은 그 줄을 빼고 */
  function selectedLineSpan(text: string, start: number, end: number) {
    const adjustedEnd = end > start && text[end - 1] === "\n" ? end - 1 : end;
    return { from: lineRangeAt(text, start).start, to: lineRangeAt(text, Math.max(start, adjustedEnd)).end };
  }

  function apply(kind: MarkKind) {
    pressingToolbar.current = false;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const { from, to } = selectedLineSpan(text, start, end);
    const next = applyMark(text.slice(from, to).split("\n"), kind).join("\n");
    if (start === end) {
      // 한 줄 — 커서는 줄 끝에서의 거리를 유지(바뀌는 건 줄 앞 표시뿐)
      const caret = Math.max(from, from + next.length - (to - start));
      replaceRange(from, to, next, caret, caret);
    } else {
      replaceRange(from, to, next, from, from + next.length);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey || e.nativeEvent.isComposing) return;
    const textarea = e.currentTarget;
    const { selectionStart: caret, selectionEnd } = textarea;
    if (caret !== selectionEnd) return;
    const text = textarea.value;
    const line = lineRangeAt(text, caret);
    if (caret !== line.end) return;
    const action = continueOnEnter(text.slice(line.start, line.end));
    if (!action) return;
    e.preventDefault();
    if (action.type === "continue") {
      const at = caret + action.prefix.length;
      replaceRange(caret, caret, action.prefix, at, at);
    } else {
      const at = line.start + action.replacement.length;
      replaceRange(line.start, line.end, action.replacement, at, at);
    }
  }

  const { from, to } = selectedLineSpan(value, selection.start, selection.end);
  const activeKind = commonKind(value.slice(from, to).split("\n"));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <MemoToolbar
        ref={toolbarRef}
        activeKind={activeKind}
        onApply={apply}
        onPressStart={() => {
          pressingToolbar.current = true;
        }}
        onPressCancel={() => {
          pressingToolbar.current = false;
          textareaRef.current?.focus();
        }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          syncSelection();
        }}
        onSelect={syncSelection}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          // 툴바 버튼을 누르는 중이면 편집을 끝내지 않는다(터치 기기는 relatedTarget이 비어 올 수 있어 플래그도 본다)
          if (pressingToolbar.current || toolbarRef.current?.contains(e.relatedTarget as Node | null)) return;
          onCommit();
        }}
        placeholder="메모"
        aria-label="메모"
        rows={3}
        className={cn(
          "border-0 bg-transparent p-0 text-[15px] leading-snug text-foreground outline-none placeholder:text-muted-foreground",
          textareaClassName
        )}
      />
      <p className="shrink-0 px-0.5 text-[12px] text-muted-foreground">
        커서가 있는 줄에 붙어요 · 같은 버튼을 다시 누르면 떼요 · Enter로 같은 표시 이어 쓰기
      </p>
    </div>
  );
}
