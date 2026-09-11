-- Weekly Todo Planner schema.
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  day text check (day in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  week_start date,
  completed boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

-- 위클리 뷰의 시간 단위 표시/드래그 리사이즈 기능을 위한 컬럼 (기존 프로젝트도 이 파일을
-- 다시 실행하면 안전하게 추가됩니다). null이면 아직 시간이 지정되지 않은 항목입니다.
alter table public.todos add column if not exists start_minutes integer;
alter table public.todos add column if not exists duration_minutes integer;

create index if not exists todos_user_id_idx on public.todos (user_id);

alter table public.todos enable row level security;

create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

-- Enables realtime sync (INSERT/UPDATE/DELETE events) across devices.
alter publication supabase_realtime add table public.todos;
