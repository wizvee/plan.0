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

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인. `.env.local`이 없으면 `/login`으로 리다이렉트되지만
Supabase 연결이 안 돼 있어 로그인은 되지 않습니다 — 위 설정을 먼저 진행하세요.

## 스택

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · dnd-kit · date-fns · Supabase (Postgres + Auth + Realtime)
