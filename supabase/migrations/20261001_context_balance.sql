-- 시간 균형 — 컨텍스트 색 · 수면 표시 (BALANCE-PLAN.md 4번)
-- 기존 프로젝트는 이 파일만 SQL Editor에서 실행. 다시 실행해도 안전하다.
-- 20260928_webapp_push.sql(contexts 테이블) 다음에 실행.

-- 컨텍스트 색 — hex가 아니라 정해진 이름(애플 캘린더처럼 고르기). 빨강(오늘 · 삭제)과 노랑(흰 배경 대비)은 뺀다.
alter table public.contexts add column if not exists color text not null default 'gray'
  check (color in ('blue', 'green', 'purple', 'orange', 'gray', 'indigo', 'teal', 'pink'));

-- 수면으로 세기 — 시간 균형에서 깨어 있는 시간에서 뺀다. 이름 · 키로 짐작하지 않고 표시로 안다. 사용자당 하나.
alter table public.contexts add column if not exists is_sleep boolean not null default false;
create unique index if not exists contexts_one_sleep_per_user on public.contexts (user_id) where is_sleep;

-- 처음부터 있던 회사(work)는 파랑으로 — 아직 색을 고른 적 없을 때만(다시 실행해도 사용자가 고른 색을 덮지 않게)
update public.contexts set color = 'blue' where key = 'work' and color = 'gray';
