-- 2026-09-28 · 컨텍스트(회사 / 개인 / …) + 웹 푸시 — WEBAPP-PLAN.md 3단계
-- Supabase SQL Editor에서 이 파일만 한 번 실행하면 된다(재실행해도 안전).
-- 1분마다 발송 API를 부르는 예약 실행(pg_cron)은 6단계에서 별도 파일로 추가한다.

-- ───────────────────────── 컨텍스트 ─────────────────────────
-- 사용자가 만드는 목록. 처음엔 회사(work) · 개인(personal, 기본) 두 개.
-- 나중에 공부(study) 같은 걸 앱에서 추가만 하면 된다 — 이 파일을 다시 고칠 필요 없음.
-- key는 iOS 단축어가 /api/context에 보내는 영문 이름.
create table if not exists public.contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  key text not null check (key ~ '^[a-z0-9_-]{1,32}$'),
  position double precision not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, key),
  -- 아래 복합 외래 키(다른 사용자의 컨텍스트를 붙이지 못하게)의 대상
  unique (id, user_id)
);

-- 사용자당 기본 컨텍스트는 하나만
create unique index if not exists contexts_one_default_per_user on public.contexts (user_id) where is_default;
create index if not exists contexts_user_id_idx on public.contexts (user_id);

alter table public.contexts enable row level security;

drop policy if exists "Users can view their own contexts" on public.contexts;
create policy "Users can view their own contexts"
  on public.contexts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own contexts" on public.contexts;
create policy "Users can insert their own contexts"
  on public.contexts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own contexts" on public.contexts;
create policy "Users can update their own contexts"
  on public.contexts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own contexts" on public.contexts;
create policy "Users can delete their own contexts"
  on public.contexts for delete
  using (auth.uid() = user_id);

-- 이미 있는 사용자에게 회사 · 개인을 넣어 둔다 (이미 있으면 건너뜀)
insert into public.contexts (user_id, name, key, position, is_default)
select u.id, '회사', 'work', 0, false from auth.users u
on conflict (user_id, key) do nothing;

insert into public.contexts (user_id, name, key, position, is_default)
select u.id, '개인', 'personal', 1, true from auth.users u
where not exists (select 1 from public.contexts c where c.user_id = u.id and c.is_default)
on conflict (user_id, key) do nothing;

-- ─────────────────── PARA 컨테이너의 컨텍스트 ───────────────────
-- null = 기본 컨텍스트. 컨텍스트를 지우면 그 컨테이너는 기본으로 돌아간다(context_id만 null).
-- (context_id, user_id) 복합 외래 키 — 남의 컨텍스트를 붙일 수 없다.
do $$
declare
  t text;
begin
  foreach t in array array['projects', 'areas', 'resources']
  loop
    execute format('alter table public.%I add column if not exists context_id uuid', t);
    if not exists (
      select 1 from pg_constraint where conname = t || '_context_fk' and conrelid = format('public.%I', t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (context_id, user_id) '
        'references public.contexts (id, user_id) on delete set null (context_id)',
        t, t || '_context_fk'
      );
    end if;
    execute format('create index if not exists %I on public.%I (context_id)', t || '_context_id_idx', t);
  end loop;
end $$;

-- ───────────────────────── 현재 컨텍스트 ─────────────────────────
-- 단축어(집중 모드)가 바꾸는 값. 행이 없거나 context_id가 null이면 "전부"(아직 단축어를 안 붙임).
-- notify_on_change: 컨텍스트가 바뀔 때 "회사 · 안 한 일 3개" 알림을 보낼지(배지 즉시 반영용, 기본 켬).
create table if not exists public.user_context (
  user_id uuid primary key references auth.users (id) on delete cascade,
  context_id uuid,
  notify_on_change boolean not null default true,
  changed_at timestamptz not null default now(),
  constraint user_context_context_fk foreign key (context_id, user_id)
    references public.contexts (id, user_id) on delete set null (context_id)
);

alter table public.user_context enable row level security;

drop policy if exists "Users can view their own user_context" on public.user_context;
create policy "Users can view their own user_context"
  on public.user_context for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own user_context" on public.user_context;
create policy "Users can insert their own user_context"
  on public.user_context for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own user_context" on public.user_context;
create policy "Users can update their own user_context"
  on public.user_context for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ───────────────────────── 푸시 구독 ─────────────────────────
-- 기기(브라우저)마다 한 행. 아이폰 · 맥 등 여러 기기 가능. endpoint는 푸시 서비스가 준 기기별 주소.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ───────────────────────── 발송 기록 ─────────────────────────
-- 같은 할 일 · 같은 예정 시각으로 두 번 보내지 않게. 발송은 서버(secret key)만 하므로 쓰기 정책은 없다.
-- 할 일 시간을 옮기면 scheduled_for가 달라져 새 시각에 다시 알린다.
create table if not exists public.push_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid not null references public.todos (id) on delete cascade,
  kind text not null default 'todo-start',
  scheduled_for timestamptz not null,
  sent_at timestamptz not null default now(),
  unique (todo_id, kind, scheduled_for)
);

create index if not exists push_log_user_id_idx on public.push_log (user_id);

alter table public.push_log enable row level security;

drop policy if exists "Users can view their own push log" on public.push_log;
create policy "Users can view their own push log"
  on public.push_log for select
  using (auth.uid() = user_id);

-- ───────────────────────── Realtime ─────────────────────────
-- 컨텍스트 목록 · 현재 컨텍스트가 바뀌면(단축어) 열린 앱에도 바로 반영되게.
do $$
declare
  t text;
begin
  foreach t in array array['contexts', 'user_context']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
