
-- Referral fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill codes
UPDATE public.profiles
SET referral_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 7))
WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx ON public.profiles(referral_code);
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

-- Bonus tracker on mining_state
ALTER TABLE public.mining_state
  ADD COLUMN IF NOT EXISTS qualifying_referees INT NOT NULL DEFAULT 0;

-- Updated new-user handler: generates code, captures referrer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  i int;
  display_name text;
  phone_number text;
  ref_code_in text;
  ref_user_id uuid;
  new_code text;
BEGIN
  display_name := coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name');
  phone_number := coalesce(new.raw_user_meta_data ->> 'phone_number', new.phone);
  ref_code_in  := upper(coalesce(new.raw_user_meta_data ->> 'referral_code', ''));

  IF ref_code_in <> '' THEN
    SELECT id INTO ref_user_id FROM public.profiles WHERE referral_code = ref_code_in LIMIT 1;
  END IF;

  -- Generate unique code (retry-safe)
  LOOP
    new_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 7));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
  END LOOP;

  INSERT INTO public.profiles (id, display_name, email, phone_number, referral_code, referred_by)
  VALUES (new.id, display_name, new.email, phone_number, new_code, ref_user_id)
  ON CONFLICT (id) DO UPDATE SET
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    phone_number = coalesce(public.profiles.phone_number, excluded.phone_number);

  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.mining_state (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
  FOR i IN 1..10 LOOP
    INSERT INTO public.tasks (user_id, slot) VALUES (new.id, i) ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN new;
END;
$function$;

-- Updated settle_mining: includes 10% per qualifying referee, and cascades to referrer
CREATE OR REPLACE FUNCTION public.settle_mining(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m record;
  valid_count int;
  qual_ref int;
  elapsed_sec numeric;
  rate_per_sec numeric := 500.0 / (30.0 * 24.0 * 3600.0);
  prev_rate numeric;
  parent_id uuid;
BEGIN
  SELECT * INTO m FROM public.mining_state WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO valid_count
  FROM public.tasks
  WHERE user_id = _user_id AND status = 'done' AND coalesce(whitelist_ok, true) = true;

  SELECT count(*) INTO qual_ref
  FROM public.profiles p
  WHERE p.referred_by = _user_id
    AND (
      SELECT count(*) FROM public.tasks t
      WHERE t.user_id = p.id AND t.status = 'done' AND coalesce(t.whitelist_ok, true) = true
    ) >= 10;

  IF m.is_active AND m.last_credited_at IS NOT NULL THEN
    elapsed_sec := EXTRACT(EPOCH FROM (now() - m.last_credited_at));
    prev_rate := rate_per_sec * (coalesce(m.effective_task_count,0)::numeric / 10.0)
               + rate_per_sec * 0.10 * coalesce(m.qualifying_referees, 0);
    UPDATE public.mining_state
    SET accrued_amount = accrued_amount + elapsed_sec * prev_rate,
        last_credited_at = now(),
        effective_task_count = valid_count,
        qualifying_referees = qual_ref,
        is_active = (valid_count > 0 OR qual_ref > 0)
    WHERE user_id = _user_id;
  ELSE
    UPDATE public.mining_state
    SET effective_task_count = valid_count,
        qualifying_referees = qual_ref,
        is_active = (valid_count > 0 OR qual_ref > 0),
        last_credited_at = CASE WHEN (valid_count > 0 OR qual_ref > 0) THEN now() ELSE last_credited_at END,
        activated_at = CASE WHEN (valid_count > 0 OR qual_ref > 0) AND activated_at IS NULL THEN now() ELSE activated_at END
    WHERE user_id = _user_id;
  END IF;

  -- Cascade to referrer so their bonus snaps to current reality
  SELECT referred_by INTO parent_id FROM public.profiles WHERE id = _user_id;
  IF parent_id IS NOT NULL AND parent_id <> _user_id THEN
    DECLARE
      pm record;
      p_valid int;
      p_qual int;
      p_elapsed numeric;
      p_rate numeric;
    BEGIN
      SELECT * INTO pm FROM public.mining_state WHERE user_id = parent_id FOR UPDATE;
      IF FOUND THEN
        SELECT count(*) INTO p_valid FROM public.tasks
          WHERE user_id = parent_id AND status='done' AND coalesce(whitelist_ok,true)=true;
        SELECT count(*) INTO p_qual FROM public.profiles p
          WHERE p.referred_by = parent_id
            AND (SELECT count(*) FROM public.tasks t
                 WHERE t.user_id=p.id AND t.status='done' AND coalesce(t.whitelist_ok,true)=true) >= 10;
        IF pm.is_active AND pm.last_credited_at IS NOT NULL THEN
          p_elapsed := EXTRACT(EPOCH FROM (now() - pm.last_credited_at));
          p_rate := rate_per_sec * (coalesce(pm.effective_task_count,0)::numeric / 10.0)
                  + rate_per_sec * 0.10 * coalesce(pm.qualifying_referees, 0);
          UPDATE public.mining_state
          SET accrued_amount = accrued_amount + p_elapsed * p_rate,
              last_credited_at = now(),
              qualifying_referees = p_qual,
              is_active = (p_valid > 0 OR p_qual > 0)
          WHERE user_id = parent_id;
        ELSE
          UPDATE public.mining_state
          SET qualifying_referees = p_qual,
              is_active = (p_valid > 0 OR p_qual > 0),
              last_credited_at = CASE WHEN (p_valid > 0 OR p_qual > 0) THEN now() ELSE last_credited_at END
          WHERE user_id = parent_id;
        END IF;
      END IF;
    END;
  END IF;
END;
$function$;
