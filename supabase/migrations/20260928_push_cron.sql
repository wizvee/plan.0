-- 웹앱 6단계 — 1분마다 /api/push/dispatch 호출 (할 일 시작 10분 전 푸시). WEBAPP-PLAN.md 6단계.
-- Vercel Cron은 요금제에 따라 하루 1회라, Supabase의 pg_cron(예약) + pg_net(HTTP 호출)으로 부른다.
--
-- 실행 전에 SQL Editor에서 **따로 한 번** 비밀값 두 개를 Vault에 넣으세요(이 파일에는 비밀값을 적지 않음):
--   select vault.create_secret('https://plan0.vercel.app/api/push/dispatch', 'push_dispatch_url');
--   select vault.create_secret('<Vercel의 PUSH_DISPATCH_SECRET과 같은 값>', 'push_dispatch_secret');
-- 값을 바꿀 땐: select vault.update_secret(id, '<새 값>') from vault.secrets where name = 'push_dispatch_secret';
--
-- 여러 번 실행해도 된다(같은 이름의 예약을 지우고 다시 만든다).

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'plan0-push-dispatch') then
    perform cron.unschedule('plan0-push-dispatch');
  end if;
end;
$$;

select cron.schedule(
  'plan0-push-dispatch',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);

-- 확인용 (실행 후 1~2분 뒤):
--   select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'plan0-push-dispatch')
--     order by start_time desc limit 5;
--   select id, status_code, content from net._http_response order by id desc limit 5;
-- 멈추려면: select cron.unschedule('plan0-push-dispatch');
