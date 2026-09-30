import { Fragment } from "react";

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
 * 사용자 텍스트(할 일 · 하위 할 일 · 메모 · PARA 이름 …)를 그릴 때 `VAR`처럼 백틱으로 감싼 부분을
 * 인라인 코드로 보여준다. 저장되는 값은 백틱이 포함된 원문 그대로이고, 표시할 때만 바꾼다.
 * 텍스트를 화면에 그리는 곳은 `{todo.content}` 대신 항상 `<InlineText text={todo.content} />`를 쓴다.
 */
export function InlineText({ text }: { text: string }) {
  if (!text.includes("`")) return text;
  return splitInlineCode(text).map((part, i) =>
    part.code ? (
      <code key={i} className={INLINE_CODE_CLASS}>
        {part.text}
      </code>
    ) : (
      <Fragment key={i}>{part.text}</Fragment>
    )
  );
}
