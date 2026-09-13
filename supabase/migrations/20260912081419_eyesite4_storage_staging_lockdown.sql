-- EYESITE 4 — private staging for pending property submissions
DROP POLICY IF EXISTS eyesite_media_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS eyesite_media_user_insert ON storage.objects;

CREATE POLICY eyesite_media_admin_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='eyesite-media' AND public.is_admin());

CREATE POLICY eyesite_private_user_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='eyesite-private'
  AND (storage.foldername(name))[1]=(SELECT auth.uid()::text)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.estado='activa'
  )
);

CREATE POLICY eyesite_private_user_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id='eyesite-private'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1]=(SELECT auth.uid()::text)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id=(SELECT auth.uid()) AND p.estado='activa'
      )
    )
  )
);

CREATE POLICY eyesite_private_user_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id='eyesite-private'
  AND (public.is_admin() OR (storage.foldername(name))[1]=(SELECT auth.uid()::text))
);
