/**
 * 바깥 링크 규칙 확인 — WEB-LINKS-PLAN.md. 마크다운 링크 · 그냥 주소(끝 문장 부호 · 괄호 · 한글) · 이름만 · 붙여넣기.
 * 실행: `npx tsx scripts/check-web-links.ts` (실패하면 exit 1)
 */
import assert from "node:assert/strict";

import { hasWebLinks, linkFromPaste, shortUrl, splitWebLinks, stripWebLinks } from "../src/lib/web-links";

const NOTE = "https://me.sap.com/notes/0003797531";

// 마크다운 링크
assert.deepEqual(splitWebLinks(`[Update HANA Cloud Root Certificate](${NOTE}) 확인`), [
  { kind: "link", label: "Update HANA Cloud Root Certificate", url: NOTE, bare: false },
  { kind: "text", text: " 확인" },
]);
// 주소 안 괄호 한 겹
assert.equal(stripWebLinks("[위키](https://en.wikipedia.org/wiki/Foo_(bar)) 끝"), "위키 끝");

// 그냥 주소 — 줄여 보이기, 끝 문장 부호 · 짝 없는 괄호 · 바로 붙은 한글은 주소가 아님
assert.equal(shortUrl("https://www.example.com/"), "example.com");
assert.equal(shortUrl("https://help.sap.com/docs/SAP_DATASPHERE/9f804b8e"), "help.sap.com/docs/SAP_DATAS…");
assert.equal(stripWebLinks("https://a.com에서 확인, https://b.com/x?y=1."), "a.com에서 확인, b.com/x?y=1.");
assert.equal(stripWebLinks("참고(https://a.com/x)."), "참고(a.com/x).");
assert.equal(stripWebLinks("참고 https://en.wikipedia.org/wiki/F_(b)"), "참고 en.wikipedia.org/wiki/F_(b)");

// 링크가 아닌 것 — 앱 안 링크 · 주소 없는 http · 다른 스킴
assert.equal(hasWebLinks("[[L사 업무(9/30)]]에서 옮김"), false);
assert.equal(hasWebLinks("no link http:// here"), false);
assert.equal(hasWebLinks("[이름](javascript:alert(1))"), false);
assert.equal(hasWebLinks("[이름](ftp://a.com)"), false);
assert.equal(hasWebLinks(`- [?] [SAP 노트](${NOTE}) 확인`), true);

// 붙여넣기 — 고른 글자 + 주소면 링크, 앞뒤 공백은 밖으로
assert.equal(linkFromPaste("SAP 노트", ` ${NOTE}\n`), `[SAP 노트](${NOTE})`);
assert.equal(linkFromPaste(" SAP ", NOTE), ` [SAP](${NOTE}) `);
assert.equal(linkFromPaste("", NOTE), null);
assert.equal(linkFromPaste("두\n줄", NOTE), null);
assert.equal(linkFromPaste("[이미] 괄호", NOTE), null);
assert.equal(linkFromPaste("https://a.com", NOTE), null);
assert.equal(linkFromPaste("SAP", "그냥 글자"), null);

console.log("check-web-links: ok");
