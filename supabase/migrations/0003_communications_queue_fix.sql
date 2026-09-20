-- =============================================================================
-- 0003_communications_queue_fix.sql
--
-- Fixes "announcement stays Queued and parents never receive it". REVIEW BEFORE RUNNING.
--
-- Root causes (found by reading the code and your data):
--   A. Nothing ever called /api/communications/process (the SMS worker): no Vercel cron, and the only
--      pg_cron job is attendance. SMS recipients therefore sat at "Pending" indefinitely.
--      -> fixed in code: the send route now triggers delivery immediately; this file adds the scheduler.
--   B. In-App-only messages were saved as "Queued" and nothing ever moved them to "Sent", even though every
--      recipient was already "Delivered". -> fixed in code for new messages; step 2 below repairs old ones.
--   C. A worker run that crashed after claiming rows left them "Queued" forever. -> step 1 below.
--   D. public.refresh_notification_status() raises "column status is of type notification_status but
--      expression is of type text", so it has never been able to move a message from "Queued" to
--      "Sent" (the callers ignore the error). Even a working scheduler could not have fixed this on its
--      own. -> step 0 below: same logic, with explicit enum casts.
--
-- Additive and idempotent. Safe to run more than once.
-- =============================================================================

-- 0. Fix refresh_notification_status (same logic and signature; adds the enum casts it was missing) ----
create or replace function public.refresh_notification_status(p_notification_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_total int; v_pending int; v_failed int;
begin
  select count(*),
         count(*) filter (where delivery_status in ('Pending','Queued')),
         count(*) filter (where delivery_status = 'Failed')
  into v_total, v_pending, v_failed
  from public.notification_recipients where notification_id = p_notification_id;

  update public.notifications
  set status = case
    when v_total = 0 then 'Failed'::public.notification_status
    when v_pending > 0 then 'Queued'::public.notification_status
    when v_failed = v_total then 'Failed'::public.notification_status
    when v_failed > 0 then 'Partially Failed'::public.notification_status
    else 'Sent'::public.notification_status
  end
  where id = p_notification_id;
end;
$function$;

-- 1. Housekeeping the worker runs at the start of every pass ------------------
create or replace function public.sms_queue_housekeeping()
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_ids uuid[];
begin
  -- Rows claimed by a run that never finished (crash / timeout): try again.
  update public.notification_recipients
     set delivery_status = 'Pending',
         failure_reason  = 'Retrying after an interrupted send'
   where channel = 'SMS'
     and delivery_status = 'Queued'
     and last_attempted_at < now() - interval '10 minutes'
     and attempts < 5;

  -- Give up on anything that has failed 5 times or is older than 24h: a "parents' meeting is today" SMS
  -- must never go out days late just because a backlog finally cleared.
  with dead as (
    update public.notification_recipients
       set delivery_status = 'Failed',
           failure_reason  = case when attempts >= 5 then 'Gave up after 5 attempts'
                                  else 'Not delivered within 24 hours, so it was expired' end
     where channel = 'SMS'
       and delivery_status in ('Pending', 'Queued')
       and (attempts >= 5 or created_at < now() - interval '24 hours')
    returning notification_id
  )
  select array_agg(distinct notification_id) into v_ids from dead;

  if v_ids is not null then
    perform public.refresh_notification_status(id) from unnest(v_ids) as id;
  end if;
end;
$function$;

-- Only the server-side worker (service role) may call it.
revoke all on function public.sms_queue_housekeeping() from public, anon, authenticated;
grant execute on function public.sms_queue_housekeeping() to service_role;

-- 2. Repair messages already stuck at "Queued" with nothing left to send ------
--    (e.g. In-App-only announcements: all recipients "Delivered", status never updated)
select public.refresh_notification_status(n.id)
from public.notifications n
where n.status = 'Queued'
  and not exists (
    select 1 from public.notification_recipients r
    where r.notification_id = n.id and r.delivery_status in ('Pending', 'Queued')
  );

-- =============================================================================
-- 3. SCHEDULER  (choose ONE option — new sends deliver immediately either way;
--    the scheduler is what delivers *scheduled* messages, retries, and any backlog)
-- =============================================================================
--
-- Make sure CRON_SECRET is set in your hosting environment variables (any long random string).
--
-- OPTION A — Vercel Cron (needs a Vercel Pro plan for per-minute schedules; Hobby allows once a day).
--   Add to vercel.json (Vercel sends "Authorization: Bearer $CRON_SECRET" automatically):
--     "crons": [
--       { "path": "/api/communications/process",            "schedule": "* * * * *" },
--       { "path": "/api/communications/dispatch-scheduled", "schedule": "* * * * *" }
--     ]
--
-- OPTION B — Supabase pg_cron + pg_net (works on any Vercel plan). Replace the two placeholders first.
--   Store the secret in Vault rather than pasting it into the job:
--     create extension if not exists pg_net;
--     select vault.create_secret('YOUR_CRON_SECRET', 'eduke_cron_secret');
--
--     select cron.schedule('eduke-process-sms', '* * * * *', $$
--       select net.http_post(
--         url     := 'https://YOUR-DOMAIN/api/communications/process',
--         headers := jsonb_build_object('Content-Type','application/json',
--                      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'eduke_cron_secret')),
--         body    := '{}'::jsonb, timeout_milliseconds := 55000) $$);
--
--     select cron.schedule('eduke-dispatch-scheduled', '* * * * *', $$
--       select net.http_post(
--         url     := 'https://YOUR-DOMAIN/api/communications/dispatch-scheduled',
--         headers := jsonb_build_object('Content-Type','application/json',
--                      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'eduke_cron_secret')),
--         body    := '{}'::jsonb, timeout_milliseconds := 55000) $$);
--
--   To remove later:  select cron.unschedule('eduke-process-sms'); select cron.unschedule('eduke-dispatch-scheduled');

-- ROLLBACK: drop function if exists public.sms_queue_housekeeping();
--   (steps 0 and 2 are corrections and need no undo)
