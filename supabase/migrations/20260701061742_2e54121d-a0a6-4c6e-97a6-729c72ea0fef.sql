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

  LOOP
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
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