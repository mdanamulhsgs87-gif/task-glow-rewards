CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.mining_state (user_id) VALUES (NEW.id);

  INSERT INTO public.tasks (user_id, slot)
  SELECT NEW.id, generate_series(1, 10);

  -- All signups are regular users. Admin panel uses a separate password gate.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- Strip admin role from any user that was auto-promoted under the old rule.
DELETE FROM public.user_roles WHERE role = 'admin';