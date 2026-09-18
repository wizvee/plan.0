// PLANNING.md 9.5 참고: 노트 메타데이터(URL/태그 등)는 옵시디언 Properties처럼 YAML frontmatter로
// 저장한다. 별도 YAML 라이브러리는 쓰지 않고, 이 앱이 직접 쓰는 단순한 모양(모든 값은 리스트)만
// 다루는 최소 파서/직렬화기를 손으로 구현했다 — 옵시디언이 열었을 때 Properties 패널로 정상
// 인식되는 정도의 유효한 YAML이면 충분하고, 임의의 YAML 문서를 완전히 지원할 필요는 없다.

/** 링크형: 값을 클릭 가능한 링크로 표시. 태그형: 값을 칩/배지로 표시. */
export type PropertyType = "link" | "tag";

export interface NoteProperty {
  key: string;
  type: PropertyType;
  values: string[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function needsQuoting(value: string): boolean {
  return value === "" || /^[\w./:?=&%~+-]+$/.test(value) === false;
}

function quoteYamlScalar(value: string): string {
  return needsQuoting(value) ? JSON.stringify(value) : value;
}

function unquoteYamlScalar(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

/** 속성 목록으로부터 YAML frontmatter 블록을 만든다. 값이 몇 개든 항상 리스트 형태로 쓴다. */
export function serializeFrontmatter(properties: NoteProperty[]): string {
  const withValues = properties.filter((p) => p.key.trim());
  if (withValues.length === 0) return "";

  const lines = withValues.flatMap((p) => {
    if (p.values.length === 0) return [`${p.key}:`];
    return [`${p.key}:`, ...p.values.map((v) => `  - ${quoteYamlScalar(v)}`)];
  });

  return `---\n${lines.join("\n")}\n---\n\n`;
}

export function serializeNoteContent(properties: NoteProperty[], body: string): string {
  return serializeFrontmatter(properties) + body;
}

function inferType(values: string[]): PropertyType {
  return values.length > 0 && values.every(isUrl) ? "link" : "tag";
}

/** frontmatter 블록(있으면)과 본문을 분리해서 파싱한다. frontmatter가 없으면 properties는 빈 배열. */
export function parseNoteContent(content: string): { properties: NoteProperty[]; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { properties: [], body: content };

  const yaml = match[1];
  const body = content.slice(match[0].length).replace(/^\n/, "");
  const properties: NoteProperty[] = [];
  let current: { key: string; values: string[] } | null = null;

  function flush() {
    if (current) properties.push({ key: current.key, type: inferType(current.values), values: current.values });
    current = null;
  }

  for (const line of yaml.split(/\r?\n/)) {
    const listItem = line.match(/^\s{2,}-\s*(.*)$/);
    if (listItem && current) {
      current.values.push(unquoteYamlScalar(listItem[1]));
      continue;
    }
    const keyLine = line.match(/^([^\s:][^:]*):\s*(.*)$/);
    if (keyLine) {
      flush();
      const [, key, inline] = keyLine;
      if (inline.trim()) {
        properties.push({ key: key.trim(), type: inferType([unquoteYamlScalar(inline)]), values: [unquoteYamlScalar(inline)] });
      } else {
        current = { key: key.trim(), values: [] };
      }
    }
  }
  flush();

  return { properties, body };
}
