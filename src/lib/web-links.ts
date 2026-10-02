/**
 * 메모 · 하위 할 일 안 바깥 링크 — 마크다운 `[이름](https://…)`과 그냥 붙여넣은 주소 `https://…` (WEB-LINKS-PLAN.md).
 * 저장은 원문 그대로(DB 변경 없음), 그릴 때만 링크로 읽는다. 할 일 제목은 링크로 읽지 않는다(사용자 결정).
 * 앱 안 할 일 링크 `[[이름(10/1)]]`은 `memo-links.ts`.
 */

export type WebLinkPart =
  | { kind: "text"; text: string }
  /** `bare` = 마크다운 없이 주소만 — 보이는 글자는 줄인 주소 */
  | { kind: "link"; label: string; url: string; bare: boolean };

/** `[이름](https://…)` — 이름은 대괄호 · 줄바꿈을 넘지 않고, 주소 안 괄호 한 겹까지(위키백과 주소 등) */
const MARKDOWN_LINK = /\[([^[\]\n]+)\]\((https?:\/\/[^\s()]+(?:\([^\s()]*\)[^\s()]*)*)\)/g;
/** 그냥 주소 — ASCII 글자까지만(`주소에서`처럼 한글이 바로 붙어도 끊기게), `<` `>` `` ` `` 빼고 */
const BARE_URL = /https?:\/\/[!-;=?-_a-~]+/g;
/** 주소 끝에 붙은 문장 부호는 주소가 아니다 */
const TRAILING_PUNCT = /[.,;:!?'"\]]$/;

/** 줄인 주소 — `https://` · `www.` · 끝 `/`를 떼고 길면 자른다 (시안 A안 `help.sap.com/docs/SAP_DATAS…`) */
const SHORT_URL_MAX = 28;

export function isWebUrl(text: string): boolean {
  if (!/^https?:\/\/\S+$/.test(text)) return false;
  try {
    return Boolean(new URL(text).hostname);
  } catch {
    return false;
  }
}

export function shortUrl(url: string): string {
  const short = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  return short.length > SHORT_URL_MAX ? `${short.slice(0, SHORT_URL_MAX - 1)}…` : short;
}

/** 주소 끝의 문장 부호 · 짝 없는 닫는 괄호를 뗀다 (`(https://a.com/x)` → `https://a.com/x`) */
function trimUrl(url: string): string {
  let out = url;
  for (;;) {
    if (TRAILING_PUNCT.test(out)) {
      out = out.slice(0, -1);
      continue;
    }
    if (out.endsWith(")") && (out.match(/\(/g)?.length ?? 0) < (out.match(/\)/g)?.length ?? 0)) {
      out = out.slice(0, -1);
      continue;
    }
    return out;
  }
}

function splitBareUrls(text: string, parts: WebLinkPart[]) {
  let last = 0;
  for (const match of text.matchAll(BARE_URL)) {
    const url = trimUrl(match[0]);
    if (!isWebUrl(url)) continue;
    if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
    parts.push({ kind: "link", label: shortUrl(url), url, bare: true });
    last = match.index + url.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
}

/** 글자를 글자 · 링크 조각으로 나눈다. 링크가 없으면 글자 조각 하나. */
export function splitWebLinks(text: string): WebLinkPart[] {
  if (!text.includes("http")) return [{ kind: "text", text }];
  const parts: WebLinkPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKDOWN_LINK)) {
    if (match.index > last) splitBareUrls(text.slice(last, match.index), parts);
    parts.push({ kind: "link", label: match[1], url: match[2], bare: false });
    last = match.index + match[0].length;
  }
  if (last < text.length) splitBareUrls(text.slice(last), parts);
  return parts.length > 0 ? parts : [{ kind: "text", text }];
}

export function hasWebLinks(text: string | null | undefined): boolean {
  return Boolean(text) && splitWebLinks(text!).some((part) => part.kind === "link");
}

/** 링크를 이름(그냥 주소는 줄인 주소)만 남긴 글자 — 누를 수 없는 곳(검색 결과 · 캘린더 블록 …)에서 */
export function stripWebLinks(text: string): string {
  if (!text.includes("http")) return text;
  return splitWebLinks(text)
    .map((part) => (part.kind === "text" ? part.text : part.label))
    .join("");
}

/**
 * 붙여넣기로 링크 만들기 — 글자를 고른 채 주소를 붙여넣으면 `[고른 글자](주소)`.
 * 고른 글자가 없거나 · 여러 줄이거나 · 대괄호가 있거나 · 그 자체가 주소면 null(평소 붙여넣기).
 * 고른 글자 앞뒤 공백은 링크 밖에 둔다.
 */
export function linkFromPaste(selected: string, pasted: string): string | null {
  const url = pasted.trim();
  if (!isWebUrl(url)) return null;
  const label = selected.trim();
  if (!label || /[\n[\]]/.test(label) || isWebUrl(label)) return null;
  const lead = selected.slice(0, selected.indexOf(label));
  const tail = selected.slice(lead.length + label.length);
  return `${lead}[${label}](${url})${tail}`;
}
