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

-- 공유하기(애플 단축어) 스크랩 기능용 컬럼. url/memo 둘 다 별도 필드이며 nullable.
alter table public.todos add column if not exists url text;
alter table public.todos add column if not exists memo text;

-- PARA (Project / Area / Resource) — 계층 없이 완전히 독립된 3개의 컨테이너 테이블.
-- 할 일 하나는 이 셋 중 최대 1곳에만 매핑됨 (아래 todos_para_single_mapping 제약으로 강제).
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  start_date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.todos add column if not exists project_id uuid references public.projects (id) on delete set null;
alter table public.todos add column if not exists area_id uuid references public.areas (id) on delete set null;
alter table public.todos add column if not exists resource_id uuid references public.resources (id) on delete set null;

alter table public.todos drop constraint if exists todos_para_single_mapping;
alter table public.todos add constraint todos_para_single_mapping
  check (num_nonnulls(project_id, area_id, resource_id) <= 1);

create index if not exists todos_project_id_idx on public.todos (project_id);
create index if not exists todos_area_id_idx on public.todos (area_id);
create index if not exists todos_resource_id_idx on public.todos (resource_id);

create index if not exists todos_user_id_idx on public.todos (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists areas_user_id_idx on public.areas (user_id);
create index if not exists resources_user_id_idx on public.resources (user_id);

alter table public.todos enable row level security;
alter table public.projects enable row level security;
alter table public.areas enable row level security;
alter table public.resources enable row level security;

-- drop + recreate so this script can be re-run safely (CREATE POLICY has no IF NOT EXISTS).
drop policy if exists "Users can view their own todos" on public.todos;
create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own todos" on public.todos;
create policy "Users can insert their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own todos" on public.todos;
create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own todos" on public.todos;
create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own projects" on public.projects;
create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own areas" on public.areas;
create policy "Users can view their own areas"
  on public.areas for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own areas" on public.areas;
create policy "Users can insert their own areas"
  on public.areas for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own areas" on public.areas;
create policy "Users can update their own areas"
  on public.areas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own areas" on public.areas;
create policy "Users can delete their own areas"
  on public.areas for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own resources" on public.resources;
create policy "Users can view their own resources"
  on public.resources for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own resources" on public.resources;
create policy "Users can insert their own resources"
  on public.resources for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own resources" on public.resources;
create policy "Users can update their own resources"
  on public.resources for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own resources" on public.resources;
create policy "Users can delete their own resources"
  on public.resources for delete
  using (auth.uid() = user_id);

-- Enables realtime sync (INSERT/UPDATE/DELETE events) across devices.
-- Guarded because ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS either.
do $$
declare
  t text;
begin
  foreach t in array array['todos', 'projects', 'areas', 'resources']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
