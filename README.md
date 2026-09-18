# 주간 Todo Planner

개인용 주간 할 일 관리 웹앱. 기획 배경과 전체 설계는 [PLANNING.md](./PLANNING.md) 참고.

## 현재 구현 상태

- Todo List(전역 보관함) + Mon~Sun **시간 단위 캘린더 그리드**(0~24시)
- 할 일 추가(보관함) / 수정(클릭) / 삭제 / 완료 체크
- 드래그 앤 드롭으로 보관함 ↔ 요일·시간 이동, 예약된 할 일을 다른 요일/시간으로 이동,
  보관함 내 순서 변경 ([`@dnd-kit`](https://dndkit.com/))
- 예약된 할 일은 소요 시간만큼 높이가 있는 블록으로 표시되고, 블록 하단을 드래그해서 리사이즈 가능
- 주차 이동 (`< 37주 >` 형태 네비게이션, "이번 주" 바로가기)
- UI: [shadcn/ui](https://ui.shadcn.com/) 기반, Apple 미리알림(Reminders) 스타일 + Tailwind CSS
- 로그인(이메일/비밀번호) + Supabase 기반 다중 기기 실시간 동기화
- 웹서핑 중 공유하기 → 애플 단축어로 링크를 Todo List에 스크랩 (`/api/clip`, 아래 참고)

## Supabase 설정 (최초 1회)

1. [supabase.com](https://supabase.com) 에서 무료 프로젝트 생성
2. 프로젝트의 **SQL Editor** 에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 그대로 실행
   (`todos` 테이블 생성 + RLS 정책 + realtime 활성화). 스크립트는 다시 실행해도 안전하도록
   작성돼 있어서, 이미 실행한 적이 있는 프로젝트에서 스키마가 업데이트됐다면 다시 실행해도 됩니다.
3. **Project Settings → API Keys** 에서 `Project URL`과 `publishable` 키(`sb_publishable_...`)를 복사
   (예전에 쓰던 `anon` 키는 legacy로 전환됨 — 새 프로젝트는 기본적으로 publishable/secret 키 체계를 씁니다.
   레거시 `anon`/`service_role` 키는 2026년 말 완전히 폐지될 예정이니 publishable 키를 쓰면 됩니다.)
4. `.env.local.example`을 `.env.local`로 복사한 뒤 값 채우기:

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

5. Vercel에 배포한다면 같은 두 값(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)을
   Vercel 프로젝트의 Environment Variables에도 등록

앱 접속 후 화면의 "가입하기"로 계정을 만들면 바로 사용할 수 있습니다(개인용이므로 가입은 본인만 하면 됩니다).

## 공유하기 → 애플 단축어로 링크 스크랩 (선택)

웹서핑하다 나중에 볼 링크를 애플 미리알림에 저장하던 것과 비슷하게, `/api/clip`로 POST하면
Todo List 보관함에 새 항목이 생깁니다(제목 + 원본 링크 임베드 카드, 완료 체크 가능).

1. `.env.local`(로컬)과 Vercel Environment Variables(배포)에 아래 세 값 추가:
   - `SUPABASE_SECRET_KEY`: **Project Settings → API Keys**의 `secret` 키(예전 `service_role`).
     이 API가 로그인 세션 없이도 본인 데이터에 쓸 수 있어야 해서 RLS를 우회하는 이 키가 필요합니다.
   - `CLIP_API_SECRET`: 아무 긴 임의 문자열(예: `openssl rand -hex 32`로 생성). 단축어가 이 값을
     `Authorization: Bearer <값>` 헤더로 보내야만 요청이 통과합니다.
   - `CLIP_USER_ID`: Supabase **Authentication → Users**에서 본인 계정의 User UID.
2. 애플 단축어 앱에서 새 단축어 생성, **"공유 시트에서 사용"** 켜기, 입력 타입을 URL로 설정.
   - (선택) "웹페이지 세부 정보 가져오기 → 이름"으로 페이지 제목을 받아 `title`로 사용하면
     링크 대신 실제 제목이 할 일 이름으로 들어갑니다.
   - (선택) "텍스트 입력 요청"으로 메모를 물어봐서 `memo`로 같이 보낼 수 있습니다(메모는 저장만
     되고 화면에는 아직 표시되지 않습니다).
   - **"URL의 콘텐츠 가져오기"** 액션 추가: URL은 `https://your-app.vercel.app/api/clip`,
     메서드 POST, 헤더 `Authorization: Bearer <CLIP_API_SECRET>`, 요청 본문은 JSON으로
     `{ "title": 위에서 받은 이름, "url": 공유받은 URL, "memo": 위에서 받은 텍스트 }`.
3. 사파리(또는 아무 앱)에서 링크를 공유 → 방금 만든 단축어 실행 → Todo List에 바로 뜹니다.

## Google Drive 연동 설정 (Project/Area/Resource별 노트·자료, 선택)

Project/Area/Resource 상세화면에서 노트(마크다운)와 첨부 자료(PPT/PDF 등)를 관리하는 기능은
DB가 아니라 **본인 Google Drive**에 파일로 저장합니다(왜 이렇게 설계했는지는
[PLANNING.md 9번](./PLANNING.md#9-노트자료-확장-기획-google-drive-연동--2026-09-18-논의-중--미구현) 참고).
아직 Notes 탭 UI 자체는 반영 전이고, 서버 쪽 연동(폴더 생성/파일 목록/업로드/노트 읽기·쓰기)만
구현돼 있는 상태입니다. **이 설정은 필수는 아니고, 안 해도 나머지 기능은 그대로 동작합니다.**

이 부분은 본인 Google 계정 로그인이 필요해서 직접 진행해야 합니다:

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성(또는 기존 프로젝트 사용).
2. **API 및 서비스 → 라이브러리**에서 "Google Drive API" 검색 후 사용 설정.
3. **API 및 서비스 → OAuth 동의 화면**: User Type은 "외부"로 만들고(개인 Gmail 계정이라 "내부"는
   선택 불가), 앱 이름/본인 이메일 정도만 채워서 저장. "테스트 사용자"에 본인 이메일을 추가
   (5번에서 refresh token을 받으려면 테스트 사용자로 등록돼 있어야 함).
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**: 애플리케이션
   유형 "웹 애플리케이션", 승인된 리디렉션 URI에 `https://developers.google.com/oauthplayground` 추가
   (아래 5번에서 refresh token을 발급받는 용도로만 쓰고, 앱 자체는 이 URI로 리디렉트되지 않습니다).
   생성 후 나오는 **클라이언트 ID / 클라이언트 보안 비밀**을 복사.
5. Refresh token 발급 — [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)에서:
   - 오른쪽 위 톱니바퀴(설정) → "Use your own OAuth credentials" 체크 → 4번에서 받은 클라이언트
     ID/보안 비밀 입력.
   - 왼쪽 목록에서 **Drive API v3 → `https://www.googleapis.com/auth/drive.file`** 스코프 선택 →
     "Authorize APIs" → 본인 Google 계정으로 로그인/동의(테스트 사용자로 등록한 계정이어야 함).
   - "Exchange authorization code for tokens" 클릭 → 나오는 **Refresh token** 값을 복사.
6. **동의 화면을 "프로덕션"으로 전환 (한 번만, 중요)** — 3번에서 만든 동의 화면이 "테스트" 상태로
   남아있으면 방금 받은 refresh token이 **7일 뒤 자동 만료**되어 7일마다 5번을 반복해야 합니다.
   **API 및 서비스 → OAuth 동의 화면**으로 돌아가서 상단의 **"게시(PUBLISH APP)"** 버튼을 눌러
   상태를 "프로덕션"으로 바꾸세요. `drive.file`은 Google이 분류한 "민감(sensitive)" 스코프일 뿐
   "제한됨(restricted)" 스코프가 아니라서, 게시해도 별도 심사 없이 바로 적용됩니다(사용자가 본인
   1명뿐인 개인 앱이라 심사 대상도 아님). 이후로는 이 refresh token을 계속 그대로 쓰면 되고,
   주기적으로 다시 발급받을 필요가 없습니다.
7. `.env.local`(로컬)과 Vercel Environment Variables(배포)에 아래 세 값 추가:
   ```
   GOOGLE_CLIENT_ID=4번에서 받은 클라이언트 ID
   GOOGLE_CLIENT_SECRET=4번에서 받은 클라이언트 보안 비밀
   GOOGLE_REFRESH_TOKEN=5번에서 받은 refresh token
   ```
   최상위 "PARA" 폴더는 앱이 API 호출 시 본인 드라이브에 알아서 만들기 때문에, 폴더를 미리
   만들거나 폴더 ID를 따로 등록할 필요는 없습니다.

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인. `.env.local`이 없으면 `/login`으로 리다이렉트되지만
Supabase 연결이 안 돼 있어 로그인은 되지 않습니다 — 위 설정을 먼저 진행하세요.

## 스택

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · dnd-kit · date-fns · Supabase (Postgres + Auth + Realtime)
