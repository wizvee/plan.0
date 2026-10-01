"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { InlineText } from "@/components/inline-text";
import { splitLinks, stripLinks } from "@/lib/memo-links";
import type { Todo } from "@/lib/types";

/** 메모 링크를 찾고 여는 쪽 — 상세 팝업이 넘겨준다(찾기 = 이 할 일 기준 `resolveLink`, 열기 = 위에 겹쳐 열기) */
export interface MemoLinks {
  resolve: (target: string) => Todo | null;
  open: (todo: Todo) => void;
}

/**
 * 링크가 들어 있을 수 있는 메모 글자 (LINKS-PLAN.md). `[[이름(10/1)]]`은 파란 링크(누르면 그 할 일),
 * 못 찾으면 회색 점선 밑줄(끊긴 링크). `legacy`면 예전 "…에서 옮김" 줄도 찾아지면 링크로(못 찾으면 보통 글자).
 * `links`가 없으면 괄호만 떼고 글자로 보여준다.
 */
export function LinkedText({ text, links, legacy = false }: { text: string; links?: MemoLinks; legacy?: boolean }) {
  if (!links) return <InlineText text={stripLinks(text)} />;
  const parts = splitLinks(text, { legacy });
  if (parts.length === 1 && parts[0].kind === "text") return <InlineText text={text} />;

  return parts.map((part, i) => {
    if (part.kind === "text") return <InlineText key={i} text={part.text} />;
    const todo = links.resolve(part.target);
    if (!todo) {
      if (part.legacy) return <InlineText key={i} text={part.label} />;
      return (
        <span
          key={i}
          title="원래 할 일을 찾을 수 없어요"
          className="text-muted-foreground underline decoration-muted-foreground/60 decoration-dotted underline-offset-[3px]"
        >
          <InlineText text={part.label} />
        </span>
      );
    }
    const date = todo.scheduledDate ? format(parseISO(todo.scheduledDate), "M월 d일 (EEE)", { locale: ko }) : null;
    return (
      <button
        key={i}
        type="button"
        onClick={(e) => {
          // 줄을 누르면 편집으로 들어가는 보기 모드 — 링크는 편집 대신 그 할 일을 연다
          e.stopPropagation();
          links.open(todo);
        }}
        title={date ? `${date} — 누르면 열기` : "누르면 열기"}
        className="rounded-[3px] text-left align-baseline font-medium text-primary underline-offset-[3px] hover:underline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <InlineText text={part.label} />
      </button>
    );
  });
}
