CREATE TABLE public.unverified_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slot integer,
  task_id uuid,
  kind text NOT NULL DEFAULT 'first_verify',
  face_label text,
  face_photo_url text,
  wallet_address text,
  wallet_private_key text,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.unverified_attempts TO authenticated;
GRANT ALL ON public.unverified_attempts TO service_role;
ALTER TABLE public.unverified_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own unverified select" ON public.unverified_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own unverified insert" ON public.unverified_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_unverified_user ON public.unverified_attempts(user_id, created_at DESC);