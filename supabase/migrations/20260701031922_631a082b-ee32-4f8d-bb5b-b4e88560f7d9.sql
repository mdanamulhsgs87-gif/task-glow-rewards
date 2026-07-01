
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE TABLE IF NOT EXISTS public.mining_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  balance_after numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mining_claims TO authenticated;
GRANT ALL ON public.mining_claims TO service_role;
ALTER TABLE public.mining_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own claims read" ON public.mining_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own claims insert" ON public.mining_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS mining_claims_user_created_idx ON public.mining_claims(user_id, created_at DESC);
