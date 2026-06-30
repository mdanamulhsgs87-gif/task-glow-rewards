
REVOKE SELECT ON public.tasks FROM authenticated;
GRANT SELECT (id, user_id, slot, status, face_photo_url, initial_verify_at, reverify_due_at, done_at, created_at, wallet_address, face_label, whitelist_ok, last_whitelist_check_at) ON public.tasks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

DROP POLICY IF EXISTS "face-photos no direct access" ON storage.objects;
CREATE POLICY "face-photos no direct access"
ON storage.objects FOR ALL
TO authenticated, anon
USING (bucket_id <> 'face-photos')
WITH CHECK (bucket_id <> 'face-photos');
