
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_photo_url text,
  ADD COLUMN IF NOT EXISTS kyc_nid_front_url text,
  ADD COLUMN IF NOT EXISTS kyc_nid_back_url text;

-- Storage: users manage their own kyc files
DROP POLICY IF EXISTS "kyc_own_read" ON storage.objects;
CREATE POLICY "kyc_own_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "kyc_own_insert" ON storage.objects;
CREATE POLICY "kyc_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "kyc_own_update" ON storage.objects;
CREATE POLICY "kyc_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc' AND (auth.uid()::text = (storage.foldername(name))[1]));
