-- Run only after configuring/deploying send-workforce-emails.
-- Enable Supabase Cron (pg_cron) and pg_net in the dashboard first.
-- Store these two values with Vault's UI, not as SQL literals in query history:
--   workforce_email_project_url: https://YOUR_PROJECT.supabase.co
--   workforce_email_worker_secret: same value as HR_EMAIL_WORKER_SECRET
begin;
do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='workforce_email_project_url' and decrypted_secret ~ '^https://[a-z0-9-]+\.supabase\.co/?$') then
    raise exception 'Set workforce_email_project_url in Supabase Vault first';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='workforce_email_worker_secret' and length(decrypted_secret)>=32) then
    raise exception 'Set workforce_email_worker_secret in Supabase Vault first';
  end if;
end; $$;

select cron.schedule('gesit-workforce-emails','* * * * *',$job$
  select net.http_post(
    url := rtrim((select decrypted_secret from vault.decrypted_secrets where name='workforce_email_project_url'),'/') || '/functions/v1/send-workforce-emails',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-email-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='workforce_email_worker_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
-- Sending stays disabled until the HR administrator explicitly enables it.
commit;
