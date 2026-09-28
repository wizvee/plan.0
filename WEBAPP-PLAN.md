# 아이폰 웹앱(홈 화면) + 알림 · 배지 계획

작성 2026-09-28. 기존 문서(PLANNING / HANDOFF / DESIGN / FEATURES / REFACTORING-PLAN / SUBTASKS-PLAN)는 건드리지 않고 이 파일에만 적습니다.
참고: `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` (Next 16 공식 PWA 가이드 — 매니페스트 · 웹 푸시 · 서비스 워커)

## 1. 지금 상태 — 웹앱으로 되나?

**홈 화면에 추가 자체는 지금도 된다.** Safari 공유 → "홈 화면에 추가"(iOS 26부터는 "웹 앱으로 열기"가 기본 켜짐) 하면
주소창 없는 창으로 열린다. 다만 "웹앱답게" 쓰기엔 빠진 게 있다.

| 항목 | 지금 | 문제 |
|---|---|---|
| 웹 앱 매니페스트 (`manifest`) | 없음 | 앱 이름 · 시작 화면 · 전체 화면(standalone) · 테마 색을 앱이 정하지 못함. **웹 푸시도 매니페스트가 있는 홈 화면 앱에서만 안정적으로 동작** |
| 홈 화면 아이콘 (`apple-icon` PNG 180×180) | 없음 (탭용 SVG만) | iOS는 SVG를 홈 아이콘으로 안 씀 → 화면 스크린샷이 아이콘이 됨 |
| 상태 막대 · 노치/홈 인디케이터 여백 | 처리 안 함 | 하단 탭바(`fixed bottom-0 h-16`)가 홈 인디케이터와 겹침. `viewport-fit=cover` + `env(safe-area-inset-*)` 필요 |
| 로그인 | Safari와 따로 | 홈 화면 앱은 Safari와 저장소(쿠키)가 분리 → **처음 한 번은 웹앱 안에서 다시 로그인** (정상 동작, 안내만 필요) |
| 오프라인 | 없음 | 서비스 워커 없음 → 비행기 모드에선 빈 화면. 이번 범위에선 "오프라인 안내 화면" 정도만 |

## 2. 알림 · 배지 — 아이폰에서 가능한 것과 제약

- **웹 푸시 알림**: iOS 16.4+에서 **홈 화면에 추가한 웹앱만** 가능(Safari 탭에선 불가). 알림 권한 요청은 반드시
  **사용자가 버튼을 눌렀을 때** 해야 한다(페이지 열자마자 자동 요청은 막힘).
- **앱 아이콘 배지**(빨간 숫자): Badging API `navigator.setAppBadge(n)` — 역시 홈 화면 웹앱 + 알림 권한이 있어야 함.
  - 앱을 **열어 둔 동안**에는 데이터가 바뀔 때마다 바로 갱신 가능.
  - 앱이 **닫혀 있으면** 푸시가 올 때(서비스 워커)만 바꿀 수 있다. iOS는 **"조용한 푸시"를 허용하지 않아** 배지만 몰래
    바꾸는 건 불가 — 배지를 바꾸려면 알림이 한 번 떠야 한다. 예: 자정에 배지를 0으로 초기화하려면 알림이 필요.
- **알림을 보내는 쪽(서버)이 필요**: 앱이 닫혀 있어도 "9시 일정 10분 전"을 알리려면 서버가 시간에 맞춰 푸시를 쏴야 한다.
  - Vercel Cron은 요금제에 따라 **하루 1회**만 가능해 분 단위 알림엔 부족 → **Supabase `pg_cron`이 1분마다 앱의 API를 호출**하는
    방식을 제안(이미 쓰는 Supabase 안에서 해결, 추가 서비스 없음).
  - 푸시 발송은 `web-push` 라이브러리 + VAPID 키(환경변수). 서버에서 모든 사용자 할 일을 읽어야 하므로
    `SUPABASE_SECRET_KEY`도 Vercel에 등록 필요(HANDOFF 다음 할 일 7번에서 아직 미등록으로 남아 있음).

## 3. 먼저 정할 것 (개념 합의 — HANDOFF "개념부터" 규칙)

아래는 제안 기본값입니다. 바꾸고 싶은 것만 말해 주세요.

| # | 질문 | 제안 |
|---|---|---|
| Q1 | 어떤 알림을 받을까? | **① 일정 시작 알림** — 캘린더에 시간이 잡힌 할 일, 시작 N분 전 · **② 아침 요약** — 매일 정해진 시각에 "오늘 할 일 5개" |
| Q2 | 일정 알림은 몇 분 전? | 기본 **10분 전**, 설정에서 0 / 5 / 10 / 30분 중 선택. 할 일마다 다르게는 이번 범위 밖 |
| Q3 | 아침 요약 시각 | 기본 **오전 8시**, 설정에서 변경 · 끄기 |
| Q4 | 배지 숫자의 의미 | **오늘 남은 할 일 수**(오늘 날짜에 배치된 미완료 할 일). 대안: Inbox 개수 |
| Q5 | 완료한 할 일 · 노트 | 알림 안 보냄. 노트는 대상 아님 |
| Q6 | 알림 누르면 | 그 날짜의 주 보기로 열기(`/?week=…`) |
| Q7 | 알림 설정 위치 | 계정 메뉴(레일 아바타)에 "알림" 항목 → 켜기 버튼 · 시간 설정 (셸 규칙상 계정 메뉴 안에서 처리) |

## 4. 단계별 작업

각 단계 따로 커밋 · 푸시, 단계마다 tsc · eslint · build. UI가 새로 생기는 4 · 6단계는 **캔버스 시안 컨펌 후** 코드로.

### 1단계 — 홈 화면 웹앱 기본기 (알림과 무관하게 바로 체감)
- `src/app/manifest.ts` — `name`/`short_name` "plan.0", `start_url` "/", `display: "standalone"`, `background_color`/`theme_color`, 아이콘 192/512 PNG.
- `src/app/apple-icon.png`(180×180) + 매니페스트용 PNG — 지금 `icon.svg`(파란 체크)에서 생성.
- `layout.tsx`: `viewport`에 `viewportFit: "cover"`, `themeColor`, `metadata.appleWebApp`(`capable`, `title`, `statusBarStyle`).
- 셸의 하단 탭바 · Inbox 바텀시트 · 레일에 `env(safe-area-inset-*)` 여백 — **셸 컴포넌트만** 수정(화면별 수정 없음).
- 확인: 아이폰에서 홈 화면에 추가 → 아이콘 · 이름 · 전체 화면 · 탭바가 홈 인디케이터 위에 오는지.

### 2단계 — 서비스 워커
- `public/sw.js`: `push` 이벤트 → `showNotification` + `setAppBadge`, `notificationclick` → 앱 열고 해당 주로 이동.
  (오프라인 캐시는 넣지 않음 — 옛 화면이 남는 문제를 피하려고. 필요하면 나중에.)
- 앱 시작 시 등록(`navigator.serviceWorker.register('/sw.js')`), `next.config.ts`에 `sw.js` 캐시 금지 헤더.

### 3단계 — DB (마이그레이션 파일만, schema.sql은 안 늘림)
`supabase/migrations/YYYYMMDD_push.sql`
- `push_subscriptions` — 기기별 구독(endpoint · 키 · user_id · 기기 이름 · 시간대 `Asia/Seoul`). 여러 기기 가능.
- `notification_settings` — 사용자별: 일정 알림 on/분, 아침 요약 on/시각.
- `notification_log` — 같은 할 일에 두 번 보내지 않게(할 일 id + 종류 + 예정 시각 unique).
- RLS는 기존과 같은 "내 것만" 규칙. 사용자에게 **이 파일만** 실행 요청.

### 4단계 — 알림 켜기 UI (시안 먼저)
- 계정 메뉴 "알림" → 켜기 버튼(여기서 권한 요청) · 일정 알림 분 · 아침 요약 시각 · 이 기기 테스트 알림 보내기.
- Safari 탭에서 열었으면 "홈 화면에 추가한 앱에서만 알림을 받을 수 있어요" 안내 + 추가 방법.
- 구독 저장/삭제 Server Action (`web-push` 공개키는 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).

### 5단계 — 발송 (서버)
- `src/app/api/push/dispatch/route.ts` — 비밀 헤더로만 호출 가능. 지금 기준으로 보낼 알림을 계산:
  - 일정: `scheduled_date + start_minutes - N분`이 지금(±1분)인 미완료 할 일
  - 아침 요약: 사용자 설정 시각이 지금이면 오늘 할 일 개수
  - `notification_log`로 중복 방지, 만료된 구독(410)은 삭제
  - 페이로드에 **배지 숫자(오늘 남은 할 일 수)** 포함 → 서비스 워커가 `setAppBadge`
- Supabase `pg_cron` + `pg_net`으로 1분마다 호출(마이그레이션 파일에 포함, 비밀값은 Supabase Vault).
- 환경변수: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_DISPATCH_SECRET`, `SUPABASE_SECRET_KEY` (Vercel + `.env.local`).

### 6단계 — 배지 실시간 갱신
- 앱이 열려 있는 동안 `useTodos` 변화에 맞춰 `setAppBadge(오늘 남은 할 일 수)` / 0이면 `clearAppBadge()`.
  셸(`AppShell`)에 훅 하나로 — 화면별 코드 없음.

### 7단계 — 문서
FEATURES · DESIGN(safe-area 규칙, 알림 설정 위치) · HANDOFF · README(환경변수, VAPID 키 만드는 법, 아이폰 설치 방법).

## 5. 사용자가 해야 할 일 (단계 진행하면서 요청)

1. (3 · 5단계) Supabase SQL Editor에서 새 마이그레이션 파일 실행, Supabase 대시보드에서 `pg_cron` · `pg_net` 확장 켜기.
2. (5단계) Vercel에 환경변수 4개 등록 — 키 생성 명령과 값 넣는 위치는 그때 안내.
3. 아이폰: Safari로 plan0.vercel.app → 공유 → 홈 화면에 추가 → 웹앱 안에서 로그인 → 계정 메뉴 → 알림 켜기.

## 6. 범위 밖

- 할 일마다 다른 알림 시각, 반복 알림, 하위 할 일 알림.
- 안드로이드 · 데스크톱 크롬 전용 설치 버튼(`beforeinstallprompt`) — 같은 코드로 알림은 동작하지만 따로 다듬지 않음.
- 오프라인 편집 · 동기화.
