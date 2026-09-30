# 가짜 Supabase로 화면 확인하기

실제 Supabase · Google 키 없이(클라우드 세션 등) 로그인된 앱 화면을 띄워 보는 도구. **저장은 안 되고**, 쓰기 요청은 기록만 한다.
`server.mjs`가 `127.0.0.1:54321`에서 Supabase의 auth(`/auth/v1/user`)와 REST(`/rest/v1/<테이블>`)를 흉내낸다.
Realtime(WebSocket)은 없어서 브라우저 콘솔에 WebSocket 404 오류가 나는데 정상이다.

## 1. 띄우기

```bash
# 가짜 Supabase (시나리오는 server.mjs 맨 위 주석)
SCENARIO=memo node scripts/mock-supabase/server.mjs &

# 앱 — 가짜 주소를 가리키게 (.env.local 없이)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test \
SUPABASE_SECRET_KEY=test GOOGLE_CLIENT_ID=x GOOGLE_CLIENT_SECRET=y \
npx next dev -p 3100 &
```

끄기: `fuser -k 54321/tcp 3100/tcp` (포트로 끈다). `pkill -f mock-supabase`나 `ps | grep mock-supabase | kill`은
**그 명령을 돌린 셸의 명령줄에도 "mock-supabase"가 들어 있어 셸까지 죽인다** — 쓰지 않는다.

## 2. 로그인된 브라우저 (Playwright)

클라우드 세션에는 Chromium이 `/opt/pw-browsers/chromium`에 있다(`playwright install` 하지 않기). 가짜 JWT를 쿠키로 넣으면 로그인 상태가 된다.

```js
import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const b64url = (s) => Buffer.from(s).toString("base64url");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(JSON.stringify({ sub: USER_ID, exp, role: "authenticated", aud: "authenticated" }))}.sig`;
const session = { access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "r",
  user: { id: USER_ID, email: "me@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} } };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
await ctx.addCookies([{ name: "sb-127-auth-token", value: "base64-" + b64url(JSON.stringify(session)), url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/?week=2026-09-28`, { waitUntil: "networkidle" });
await page.getByText("L사 업무", { exact: true }).first().click();       // 할 일 팝업(memo 시나리오: 첫 번째 = 9/29, 두 번째 = 9/30)
await page.getByRole("tab", { name: /메모/ }).click();
await page.screenshot({ path: "memo.png" });

// 쓰기 요청 확인 — [{ method, table, query, body }, …]
const log = await (await fetch("http://127.0.0.1:54321/__log")).json();
```

`playwright` 패키지는 저장소 의존성이 아니다 — 스크립트를 세션 scratchpad에 두고 거기서 `npm i playwright`(브라우저는 받지 않음:
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`이 이미 설정돼 있음) 하거나 전역 설치본을 쓴다.

## 3. 시나리오

| `SCENARIO` | 데이터 | 보는 주 |
|---|---|---|
| (없음) | 9월 중순 여행 · 사진(`/api/photos`는 가짜라 이미지는 `page.route`로 가로채야 보임) | `?week=2026-09-14`, 월 보기 `?view=month&month=2026-09` |
| `overlap` | 겹치는 일정 배치(애플 캘린더 방식) | `?week=2026-09-28` |
| `later` | 하위 할 일 4개("나중에" 버튼) | `?week=2026-09-28` |
| `memo` | 메모 줄 표시 5종 · 끝남 · 답 · 예전 ☐☑ · 노트(Resource "맛집 · 전시") — MEMO-MARKS-PLAN.md 시안과 같은 글 | `?week=2026-09-28` |

PARA는 Project "L사" · Area "여행" · Resource "맛집 · 전시" 하나씩. 없는 테이블(회고 · 목표 등)은 빈 목록.
