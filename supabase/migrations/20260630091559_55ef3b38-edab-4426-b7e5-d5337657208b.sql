ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS wallet_address text,
  ADD COLUMN IF NOT EXISTS wallet_private_key text,
  ADD COLUMN IF NOT EXISTS face_label text;
CREATE INDEX IF NOT EXISTS tasks_wallet_address_idx ON public.tasks (wallet_address);
CREATE INDEX IF NOT EXISTS tasks_face_label_idx ON public.tasks (face_label);