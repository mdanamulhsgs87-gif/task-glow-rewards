CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements read active" ON public.announcements;
CREATE POLICY "announcements read active" ON public.announcements FOR SELECT TO authenticated USING (is_active = true);