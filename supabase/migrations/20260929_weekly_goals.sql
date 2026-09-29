-- 2026-09-29 · 주간 목표 — GOALS-PLAN.md 3번
-- Supabase SQL Editor에서 이 파일만 한 번 실행하면 된다(재실행해도 안전). Postgres 15+ 문법(on delete set null (col)).
-- 목표 = 한 주(월요일 시작)의 한 줄 목표 + PARA 하나(선택). 진행률은 저장하지 않고 연결된 할 일에서 매번 계산한다.
-- 할 일 하나는 목표 최대 1개(todos.goal_id). 목표를 지우면 할 일은 남고 연결만 풀린다.

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  content text not null check (length(btrim(content)) > 0),
  project_id uuid references public.projects (id) on delete set null,
  area_id uuid references public.areas (id) on delete set null,
  resource_id uuid references public.resources (id) on delete set null,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  constraint weekly_goals_one_para check (num_nonnulls(project_id, area_id, resource_id) <= 1),
  -- week_start는 항상 그 주 월요일
  constraint weekly_goals_monday check (extract(isodow from week_start) = 1),
  unique (id, user_id)
);

create index if not exists weekly_goals_user_week_idx on public.weekly_goals (user_id, week_start);

alter table public.weekly_goals enable row level security;

-- insert/update는 붙이는 PARA도 내 것인지 확인한다 — 남의 id로 끼워 넣지 못하게.
drop policy if exists "Users can view their own weekly goals" on public.weekly_goals;
create policy "Users can view their own weekly goals"
  on public.weekly_goals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own weekly goals" on public.weekly_goals;
create policy "Users can insert their own weekly goals"
  on public.weekly_goals for insert
  with check (
    auth.uid() = user_id
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
    and (area_id is null or exists (select 1 from public.areas a where a.id = area_id and a.user_id = auth.uid()))
    and (resource_id is null or exists (select 1 from public.resources r where r.id = resource_id and r.user_id = auth.uid()))
  );

drop policy if exists "Users can update their own weekly goals" on public.weekly_goals;
create policy "Users can update their own weekly goals"
  on public.weekly_goals for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
    and (area_id is null or exists (select 1 from public.areas a where a.id = area_id and a.user_id = auth.uid()))
    and (resource_id is null or exists (select 1 from public.resources r where r.id = resource_id and r.user_id = auth.uid()))
  );

drop policy if exists "Users can delete their own weekly goals" on public.weekly_goals;
create policy "Users can delete their own weekly goals"
  on public.weekly_goals for delete
  using (auth.uid() = user_id);

-- ───────────────────────── 할 일 → 목표 연결 ─────────────────────────
-- (goal_id, user_id) 복합 외래 키 — 남의 목표에 연결할 수 없다(컨텍스트와 같은 방식). 목표를 지우면 goal_id만 null.
alter table public.todos add column if not exists goal_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'todos_goal_fk' and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos add constraint todos_goal_fk foreign key (goal_id, user_id)
      references public.weekly_goals (id, user_id) on delete set null (goal_id);
  end if;
end $$;

create index if not exists todos_goal_id_idx on public.todos (goal_id);

-- 실시간 동기화 대상에 추가 (todos는 이미 들어 있음)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weekly_goals'
  ) then
    alter publication supabase_realtime add table public.weekly_goals;
  end if;
end $$;
