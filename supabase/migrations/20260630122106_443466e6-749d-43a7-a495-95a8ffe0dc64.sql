
-- 1. Allow slots > 10 (user can add more sets of 10)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_slot_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_slot_check CHECK (slot >= 1 AND slot <= 1000);

-- 2. Add FKs to profiles so PostgREST embed `profiles:user_id(...)` works in admin queries
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_user_id_profiles_fkey FOREIGN KEY (user_id)
  REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_user_id_profiles_fkey;

ALTER TABLE public.unverified_attempts
  ADD CONSTRAINT unverified_user_id_profiles_fkey FOREIGN KEY (user_id)
  REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.unverified_attempts VALIDATE CONSTRAINT unverified_user_id_profiles_fkey;

ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_user_id_profiles_fkey FOREIGN KEY (user_id)
  REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.withdrawals VALIDATE CONSTRAINT withdrawals_user_id_profiles_fkey;

ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_user_id_profiles_fkey FOREIGN KEY (user_id)
  REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.wallets VALIDATE CONSTRAINT wallets_user_id_profiles_fkey;

ALTER TABLE public.mining_state
  ADD CONSTRAINT mining_state_user_id_profiles_fkey FOREIGN KEY (user_id)
  REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.mining_state VALIDATE CONSTRAINT mining_state_user_id_profiles_fkey;

-- 3. Add per-task whitelist tracking
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS whitelist_ok boolean NOT NULL DEFAULT true;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS last_whitelist_check_at timestamptz;

-- 4. Add effective_task_count on mining_state to scale rate per valid done task
ALTER TABLE public.mining_state ADD COLUMN IF NOT EXISTS effective_task_count integer NOT NULL DEFAULT 0;

-- 5. Settle function: credits old accrued at the previous rate, then refreshes effective rate
CREATE OR REPLACE FUNCTION public.settle_mining(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  valid_count int;
  elapsed_sec numeric;
  rate_per_sec numeric := 500.0 / (30.0 * 24.0 * 3600.0);
  prev_effective_rate numeric;
BEGIN
  SELECT * INTO m FROM public.mining_state WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO valid_count
  FROM public.tasks
  WHERE user_id = _user_id AND status = 'done' AND coalesce(whitelist_ok, true) = true;

  IF m.is_active AND m.last_credited_at IS NOT NULL AND coalesce(m.effective_task_count,0) > 0 THEN
    elapsed_sec := EXTRACT(EPOCH FROM (now() - m.last_credited_at));
    prev_effective_rate := rate_per_sec * (m.effective_task_count::numeric / 10.0);
    UPDATE public.mining_state
    SET accrued_amount = accrued_amount + elapsed_sec * prev_effective_rate,
        last_credited_at = now(),
        effective_task_count = valid_count,
        is_active = (valid_count > 0)
    WHERE user_id = _user_id;
  ELSE
    UPDATE public.mining_state
    SET effective_task_count = valid_count,
        is_active = (valid_count > 0),
        last_credited_at = CASE WHEN valid_count > 0 THEN now() ELSE last_credited_at END,
        activated_at = CASE WHEN valid_count > 0 AND activated_at IS NULL THEN now() ELSE activated_at END
    WHERE user_id = _user_id;
  END IF;
END;
$$;

-- Backfill effective count for current users
UPDATE public.mining_state ms
SET effective_task_count = sub.cnt
FROM (
  SELECT user_id, count(*) AS cnt FROM public.tasks
  WHERE status = 'done' AND coalesce(whitelist_ok,true) = true
  GROUP BY user_id
) sub
WHERE ms.user_id = sub.user_id;

-- 6. Storage policy so admin (service role) can read face photos via signed URL —
-- service_role already bypasses, but we ensure bucket exists privately (no change needed).

-- 7. Enable pg_cron + pg_net for daily 6PM Asia/Dhaka (= 12:00 UTC) whitelist recheck.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
