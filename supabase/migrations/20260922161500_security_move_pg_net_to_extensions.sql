-- EYESITE: move pg_net out of exposed public schema.
-- The extension currently lives in schema net; the scheduler is updated to the new schema-qualified function.

alter extension pg_net set schema extensions;

select cron.alter_job(
  1,
  '* * * * *',
  $job$
select extensions.http_post(
  url:='https://xhvpvpvtkdgnnxdwdrkn.supabase.co/functions/v1/process-scheduled-communications',
  headers:=jsonb_build_object(
    'Content-Type','application/json',
    'apikey',(select decrypted_secret from vault.decrypted_secrets where name='eyesite_scheduler_secret'),
    'x-eyesite-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='eyesite_scheduler_secret')
  ),
  body:=jsonb_build_object('run_at',now()),
  timeout_milliseconds:=10000
) as request_id;
$job$,
  'postgres',
  'postgres',
  true
);