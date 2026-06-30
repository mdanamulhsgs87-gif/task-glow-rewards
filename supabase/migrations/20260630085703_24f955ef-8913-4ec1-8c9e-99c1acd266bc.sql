ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
  display_name text;
  phone_number text;
BEGIN
  display_name := coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name');
  phone_number := coalesce(new.raw_user_meta_data ->> 'phone_number', new.phone);

  INSERT INTO public.profiles (id, display_name, email, phone_number)
  VALUES (new.id, display_name, new.email, phone_number)
  ON CONFLICT (id) DO UPDATE SET
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    phone_number = coalesce(public.profiles.phone_number, excluded.phone_number);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.mining_state (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  FOR i IN 1..10 LOOP
    INSERT INTO public.tasks (user_id, slot)
    VALUES (new.id, i)
    ON CONFLICT (user_id, slot) DO NOTHING;
  END LOOP;

  RETURN new;
END;
$$;