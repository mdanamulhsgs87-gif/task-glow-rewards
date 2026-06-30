
REVOKE SELECT ON public.unverified_attempts FROM authenticated;
GRANT SELECT (id, user_id, slot, task_id, kind, face_label, face_photo_url, wallet_address, reason, created_at) ON public.unverified_attempts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unverified_attempts TO authenticated;
