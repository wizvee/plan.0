"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "@/components/icons";

import { cn } from "@/lib/utils";
import { InlineText } from "@/components/inline-text";
import { ReflectionKindIcon, ReflectionKindSelect } from "@/components/reflection/reflection-kind";
import { REFLECTION_META } from "@/lib/reflection";
import type { Reflection, ReflectionKind } from "@/lib/types";
import type { ReflectionOwner } from "@/lib/supabase/reflections";
import { useReflectionActions } from "@/lib/app-data/reflection-actions";

/** 한글 조합 중 Enter는 무시 — 안 하면 마지막 글자가 한 번 더 들어간다. */
function isCommitEnter(e: KeyboardEvent<HTMLInputElement>) {
  return e.key === "Enter" && !e.nativeEvent.isComposing;
}

/**
 * 회고 추가 줄 — 종류 드롭다운 + 입력칸. Enter로 연속 추가하고, 고른 종류는 추가한 뒤에도 유지한다
 * (같은 종류를 연달아 쓸 때 드롭다운을 다시 안 열어도 되게).
 */
export function ReflectionAddRow({
  owner,
  placement,
  placeholderSuffix = "",
  className,
}: {
  owner: ReflectionOwner;
  placement: "up" | "down";
  /** 입력칸 안내 문구 뒤에 붙는 말 — 프로젝트 회고 탭은 "(프로젝트 전체)" */
  placeholderSuffix?: string;
  className?: string;
}) {
  const actions = useReflectionActions();
  const [kind, setKind] = useState<ReflectionKind>("keep");
  const [draft, setDraft] = useState("");

  function submit() {
    if (!draft.trim()) return;
    actions.add(owner, kind, draft);
    setDraft("");
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* 마우스로 종류를 고르는 동안 입력칸 포커스를 뺏지 않는다 — Safari는 버튼을 눌러도 포커스가 안 가서
          아래 onBlur의 relatedTarget 확인만으로는 막을 수 없다 */}
      <div onMouseDown={(e) => e.preventDefault()}>
        <ReflectionKindSelect value={kind} onChange={setKind} placement={placement} />
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (isCommitEnter(e)) {
            e.preventDefault();
            submit(); // 포커스는 그대로 — 연속 입력
          }
        }}
        onBlur={(e) => {
          // 종류 드롭다운을 누르러 간 거면 아직 저장하지 않는다 — 종류를 바꾼 뒤 Enter로 저장
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) submit();
        }}
        placeholder={`${REFLECTION_META[kind].placeholder}${placeholderSuffix}`}
        aria-label="회고 추가"
        className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[14px] outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/** 회고 한 줄의 텍스트 — 평소엔 `코드`가 렌더링된 텍스트, 누르면 원문 입력칸. 비우면 삭제. */
export function ReflectionText({ reflection, className }: { reflection: Reflection; className?: string }) {
  const actions = useReflectionActions();
  const [text, setText] = useState(reflection.content);
  const [editing, setEditing] = useState(false);

  function commit() {
    setEditing(false);
    if (text.trim() === reflection.content) {
      setText(reflection.content);
      return;
    }
    actions.edit(reflection.id, text);
  }

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (isCommitEnter(e)) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label="회고 내용"
        className={cn("min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] leading-[1.42] outline-none", className)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`${reflection.content} — 눌러서 수정`}
      className={cn("min-w-0 flex-1 cursor-text break-words text-left text-[14px] leading-[1.42]", className)}
    >
      <InlineText text={reflection.content} />
    </button>
  );
}

/**
 * 할 일 하나의 회고 목록 + 맨 아래 추가 줄 (할 일 상세 모달의 회고 탭).
 * 부모가 높이를 정해주면 목록만 스크롤되고 추가 줄은 바닥에 붙어 있다. 종류 메뉴는 위로 열린다.
 */
export function TodoReflectionList({ todoId, reflections }: { todoId: string; reflections: Reflection[] }) {
  const actions = useReflectionActions();

  return (
    <div className="flex min-h-0 flex-col rounded-[10px] border border-border">
      {reflections.length > 0 ? (
        <div className="min-h-0 overflow-y-auto rounded-t-[10px]">
          {reflections.map((reflection) => (
            // content를 key에 넣어 다른 기기에서 바뀐 내용이 오면 입력칸을 새 값으로 초기화
            <div
              key={`${reflection.id}:${reflection.content}`}
              className="group flex items-start gap-2.5 border-b border-border py-[9px] pl-2.5 pr-1.5 hover:bg-black/[0.03]"
            >
              <ReflectionKindIcon kind={reflection.kind} />
              <ReflectionText reflection={reflection} className="pt-px" />
              <button
                type="button"
                onClick={() => actions.remove(reflection.id)}
                aria-label="회고 삭제"
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <X weight="bold" className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <ReflectionAddRow owner={{ todoId }} placement="up" className="py-1 pl-1.5 pr-2.5" />
    </div>
  );
}
