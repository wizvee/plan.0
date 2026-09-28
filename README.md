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

Project/Area/Resource 상세화면의 "자료" 탭에서 노트(마크다운)와 첨부 자료(PPT/PDF/시트 등)를
관리하는 기능은 DB가 아니라 **본인 Google Drive**에 파일로 저장합니다(왜 이렇게 설계했는지는
[PLANNING.md 9번](./PLANNING.md#9-노트자료-확장-기획-google-drive-연동--2026-09-18-구현-완료) 참고).
**이 설정은 필수는 아니고, 안 해도 나머지 기능은 그대로 동작합니다.**

refresh token은 환경변수에 하드코딩하지 않습니다 — 로그인한 사용자가 사이드바의 **"Google Drive
연결"**을 누르면 앱이 직접 Google 동의 화면으로 보냈다가 돌아와서, 그 사용자 몫의 refresh token을
`google_accounts` 테이블에 저장합니다(사용자별로 각자 자기 Drive를 연결하는 구조 — 나중에 여러
사용자를 지원하게 되어도 그대로 씁니다). Google Cloud 콘솔 설정은 아래 4단계만 최초 1회 필요하고,
이후 실제 연결(토큰 발급)은 다시 콘솔에 갈 필요 없이 앱 안 버튼만 누르면 됩니다:

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성(또는 기존 프로젝트 사용).
2. **API 및 서비스 → 라이브러리**에서 "Google Drive API" 검색 후 사용 설정.
3. **API 및 서비스 → OAuth 동의 화면**: User Type은 "외부"로 만들고(개인 Gmail 계정이라 "내부"는
   선택 불가), 앱 이름/본인 이메일 정도만 채워서 저장. "테스트 사용자"에 본인 이메일을 추가
   (동의 화면을 "프로덕션"으로 게시하기 전까지는, 여기 등록된 이메일로만 연결 가능).
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**: 애플리케이션
   유형 "웹 애플리케이션", **승인된 리디렉션 URI**에 앱이 실제로 쓰는 콜백 주소를 등록:
   - 로컬 개발: `http://localhost:3000/api/auth/google/callback`
   - 배포 주소(예: Vercel): `https://your-app.vercel.app/api/auth/google/callback`

   생성 후 나오는 **클라이언트 ID / 클라이언트 보안 비밀**을 복사해서 `.env.local`(로컬)과 Vercel
   Environment Variables(배포)에 등록:
   ```
   GOOGLE_CLIENT_ID=여기서 받은 클라이언트 ID
   GOOGLE_CLIENT_SECRET=여기서 받은 클라이언트 보안 비밀
   ```

이제 앱에 로그인한 뒤 사이드바 하단 계정 영역의 **"Google Drive 연결"**을 누르면 Google 동의
화면으로 이동 → 로그인/동의하면 자동으로 돌아와서 연결이 끝납니다. "PARA"라는 최상위 폴더는
앱이 그 시점에 본인 드라이브에 알아서 만들기 때문에, 폴더를 미리 만들거나 폴더 ID를 등록할 필요는
없습니다.

### "Drive에서 가져오기" — Drive 웹사이트에서 직접 넣은 기존 파일 보이게 하기 (선택)

이 앱은 `drive.file`이라는 좁은 스코프를 쓰기 때문에, **앱이 직접 만들거나 업로드한 파일만**
자동으로 보입니다. Google Drive 웹사이트에서 프로젝트 폴더에 직접 넣은 기존 파일(예: 미리
만들어둔 구글 시트, PDF)은 API가 원천적으로 못 봅니다 — 이건 버그가 아니라 이 스코프의 정책이고,
Google Picker로 사용자가 직접 그 파일을 "골라야만" 앱에 접근 권한이 생깁니다. 자료 탭의
**"Drive에서 가져오기"** 버튼이 그 역할을 합니다. 쓰려면 Cloud Console에서 2단계가 더 필요합니다:

1. **API 및 서비스 → 라이브러리**에서 "Google Picker API" 검색 후 사용 설정 (Drive API와 별개로
   켜야 합니다).
2. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**로 새 키를 만들고,
   **키 제한사항**에서:
   - 애플리케이션 제한사항: "HTTP 리퍼러(웹사이트)"로 설정하고 내 도메인 등록
     (`http://localhost:3000/*`, `https://your-app.vercel.app/*` 등)
   - API 제한사항: "Google Picker API"만 선택 (다른 API에는 이 키를 못 쓰게 좁혀둠)

   만든 키를 `.env.local`(로컬)과 Vercel Environment Variables(배포)에 등록:
   ```
   NEXT_PUBLIC_GOOGLE_API_KEY=여기서 받은 API 키
   ```

   `NEXT_PUBLIC_` 접두사가 붙어서 브라우저 코드에 그대로 노출되는데, Picker 위젯 자체가 브라우저에서
   뜨는 거라 원래 이렇게 씁니다 — 위 리퍼러 제한이 실질적인 보호 장치입니다. refresh token이나
   클라이언트 시크릿과는 성격이 다른 값이니 안심하고 노출해도 됩니다.
3. 설정 후 자료 탭 → "Drive에서 가져오기"를 누르면 그 프로젝트 폴더를 기본 위치로 하는 선택
   창이 뜨고, 고른 파일이 바로 목록에 나타납니다(같은 폴더 안 파일이 아니어도 고르면 자동으로
   이 폴더의 자식으로 추가됩니다).

**동의 화면 게시 상태("테스트" vs "프로덕션")**: 3번에서 만든 동의 화면을 "테스트" 상태로 두면
Google 정책상 발급되는 refresh token이 7일 뒤 만료되어, 그 이후엔 사이드바에서 "Google Drive
연결"을 다시 누르면 됩니다(콘솔에 갈 필요 없이 버튼 클릭 한 번). "프로덕션"으로 게시하면 이 7일
제한이 없어지지만, 완전히 선택 사항이고 지금 당장 정할 필요는 없습니다 — 두 상태 모두 앱 자체를
공개 배포하거나 가입을 여는 것과는 무관한, Google Cloud 콘솔 안의 별도 설정입니다.

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인. `.env.local`이 없으면 `/login`으로 리다이렉트되지만
Supabase 연결이 안 돼 있어 로그인은 되지 않습니다 — 위 설정을 먼저 진행하세요.

## 스택

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · dnd-kit · date-fns · Supabase (Postgres + Auth + Realtime)
