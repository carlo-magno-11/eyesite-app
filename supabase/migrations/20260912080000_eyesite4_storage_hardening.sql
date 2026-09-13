-- EYESITE 4 — Storage hardening
-- Public media is limited to authenticated active users/admins and owner/admin mutations.
-- Sensitive admin documents live in a private bucket.

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'eyesite-private','eyesite-private',false,26214400,
  ARRAY[
    'application/pdf','application/zip','application/x-zip-compressed',
    'application/vnd.google-earth.kml+xml','application/vnd.google-earth.kmz',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','image/jpeg','image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public=false,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;

DROP POLICY IF EXISTS eyesite_media_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS eyesite_media_user_insert ON storage.objects;
CREATE POLICY eyesite_media_user_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='eyesite-media'
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

CREATE POLICY eyesite_private_admin_select
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='eyesite-private' AND public.is_admin());
CREATE POLICY eyesite_private_admin_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='eyesite-private' AND public.is_admin());
CREATE POLICY eyesite_private_admin_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='eyesite-private' AND public.is_admin())
WITH CHECK (bucket_id='eyesite-private' AND public.is_admin());
CREATE POLICY eyesite_private_admin_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='eyesite-private' AND public.is_admin());

UPDATE storage.buckets
SET file_size_limit=52428800,
    allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/x-m4v']
WHERE id='eyesite-media';
