import { Fragment } from "react";

import { ArrowUpRight } from "@/components/icons";
import { splitWebLinks } from "@/lib/web-links";

/** 백틱 한 쌍으로 감싼 구간 — 줄바꿈은 넘지 않는다. 닫히지 않은 백틱은 그대로 글자로 보인다. */
const INLINE_CODE = /`([^`\n]+)`/g;

/** 인라인 코드 모양 — `InlineText` · 검색 결과 강조(`HighlightText`)가 같이 쓴다 */
export const INLINE_CODE_CLASS = "rounded-[4px] bg-black/[0.06] px-[0.3em] py-px font-mono text-[0.9em] [overflow-wrap:anywhere]";

/** 사용자 텍스트를 보통 글자 · 인라인 코드 조각으로 나눈다(코드 조각의 text는 백틱을 뺀 안쪽). */
export function splitInlineCode(text: string): { code: boolean; text: string }[] {
  if (!text.includes("`")) return [{ code: false, text }];
  const parts: { code: boolean; text: string }[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    if (match.index > last) parts.push({ code: false, text: text.slice(last, match.index) });
    parts.push({ code: true, text: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ code: false, text: text.slice(last) });
  return parts;
}

/**
 * 바깥 링크 (WEB-LINKS-PLAN.md 시안 A안) — 파란 글자 + 끝에 작은 ↗, 새 탭으로 연다.
 * ↗는 마지막 단어와 같이 줄바꿈되게 묶는다. 줄을 누르면 편집으로 들어가는 곳이 많아 클릭은 위로 올리지 않는다.
 * 취소선이 그어진 줄(완료한 하위 할 일 · 확인한 줄) 안에서는 파랑 대신 그 줄의 회색을 따른다.
 */
function WebLink({ label, url }: { label: string; url: string }) {
  const at = label.lastIndexOf(" ");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="rounded-[3px] font-medium text-primary underline-offset-[3px] hover:underline focus-visible:outline-2 focus-visible:outline-primary [.line-through_&]:text-current"
    >
      {label.slice(0, at + 1)}
      <span className="whitespace-nowrap">
        {label.slice(at + 1)}
        <ArrowUpRight weight="bold" className="ml-px inline size-[0.72em] align-[-0.02em]" aria-hidden="true" />
      </span>
    </a>
  );
}

/** 코드가 아닌 글자 조각 — `links`면 바깥 링크를 읽는다(누를 수 있게 / 이름만) */
function TextPart({ text, links }: { text: string; links?: "open" | "label" }) {
  if (!links) return text;
  const parts = splitWebLinks(text);
  if (parts.length === 1 && parts[0].kind === "text") return text;
  return parts.map((part, i) =>
    part.kind === "text" ? (
      <Fragment key={i}>{part.text}</Fragment>
    ) : links === "open" ? (
      <WebLink key={i} label={part.label} url={part.url} />
    ) : (
      <Fragment key={i}>{part.label}</Fragment>
    )
  );
}

/**
 * 사용자 텍스트(할 일 · 하위 할 일 · 메모 · PARA 이름 …)를 그릴 때 `VAR`처럼 백틱으로 감싼 부분을
 * 인라인 코드로 보여준다. 저장되는 값은 백틱이 포함된 원문 그대로이고, 표시할 때만 바꾼다.
 * 텍스트를 화면에 그리는 곳은 `{todo.content}` 대신 항상 `<InlineText text={todo.content} />`를 쓴다.
 *
 * `links` — 메모 · 하위 할 일 글자의 바깥 링크(`[이름](https://…)` · 그냥 주소). `"open"` = 누를 수 있는 링크(상세 팝업),
 * `"label"` = 이름만 글자로(캘린더 블록 · 검색 결과처럼 줄 전체를 누르는 곳). 없으면 원문 그대로 — 할 일 제목은 링크로 읽지 않는다.
 */
export function InlineText({ text, links }: { text: string; links?: "open" | "label" }) {
  if (!text.includes("`")) return <TextPart text={text} links={links} />;
  return splitInlineCode(text).map((part, i) =>
    part.code ? (
      <code key={i} className={INLINE_CODE_CLASS}>
        {part.text}
      </code>
    ) : (
      <TextPart key={i} text={part.text} links={links} />
    )
  );
}
