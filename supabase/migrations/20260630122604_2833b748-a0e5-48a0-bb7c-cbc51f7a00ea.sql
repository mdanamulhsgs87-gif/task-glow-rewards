
-- Store a cron secret in vault (only service role and DB can read it)
DO $$
DECLARE
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'whitelist_cron_secret') THEN
    PERFORM vault.create_secret(v_secret, 'whitelist_cron_secret', 'Daily whitelist re-check token');
  END IF;
END $$;

-- Helper to fetch the decrypted token (service role only)
CREATE OR REPLACE FUNCTION public.get_whitelist_cron_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'whitelist_cron_secret' LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_whitelist_cron_secret() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_whitelist_cron_secret() TO service_role;

-- Schedule daily 12:00 UTC (= 18:00 Asia/Dhaka)
SELECT cron.unschedule('whitelist-daily-recheck') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'whitelist-daily-recheck'
);

SELECT cron.schedule(
  'whitelist-daily-recheck',
  '0 12 * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://project--9faa7771-af86-4101-8cf2-0ed6dd381713.lovable.app/api/public/whitelist-recheck',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'whitelist_cron_secret' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);
