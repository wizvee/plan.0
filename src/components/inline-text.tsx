import { Fragment } from "react";

/** 백틱 한 쌍으로 감싼 구간 — 줄바꿈은 넘지 않는다. 닫히지 않은 백틱은 그대로 글자로 보인다. */
const INLINE_CODE = /`([^`\n]+)`/g;

/**
 * 사용자 텍스트(할 일 · 하위 할 일 · 메모 · PARA 이름 …)를 그릴 때 `VAR`처럼 백틱으로 감싼 부분을
 * 인라인 코드로 보여준다. 저장되는 값은 백틱이 포함된 원문 그대로이고, 표시할 때만 바꾼다.
 * 텍스트를 화면에 그리는 곳은 `{todo.content}` 대신 항상 `<InlineText text={todo.content} />`를 쓴다.
 */
export function InlineText({ text }: { text: string }) {
  if (!text.includes("`")) return text;

  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    const start = match.index;
    if (start > last) parts.push(<Fragment key={`t${last}`}>{text.slice(last, start)}</Fragment>);
    parts.push(
      <code
        key={`c${start}`}
        className="rounded-[4px] bg-black/[0.06] px-[0.3em] py-px font-mono text-[0.9em] [overflow-wrap:anywhere]"
      >
        {match[1]}
      </code>
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  return parts;
}
