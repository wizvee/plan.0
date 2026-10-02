import type { ClipboardEvent } from "react";

import { linkFromPaste } from "@/lib/web-links";

/**
 * 입력칸 `onPaste` — 글자를 고른 채 주소를 붙여넣으면 `[고른 글자](주소)`로 바꿔 넣는다 (WEB-LINKS-PLAN.md).
 * 아니면 아무것도 하지 않는다(평소 붙여넣기). `execCommand("insertText")`라 ⌘Z로 되돌릴 수 있고 React onChange도 그대로 온다.
 */
export function pasteAsLink(e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  const input = e.currentTarget;
  const { selectionStart: start, selectionEnd: end } = input;
  if (start === null || end === null || start === end) return;
  const next = linkFromPaste(input.value.slice(start, end), e.clipboardData.getData("text/plain"));
  if (next === null) return;
  e.preventDefault();
  if (!document.execCommand("insertText", false, next)) {
    input.setRangeText(next, start, end, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
