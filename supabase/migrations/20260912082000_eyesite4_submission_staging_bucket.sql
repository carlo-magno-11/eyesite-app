-- EYESITE 4 — private staging bucket for user property photos/videos.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'eyesite-staging','eyesite-staging',false,104857600,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/x-m4v']
)
ON CONFLICT (id) DO UPDATE SET
  public=false,file_size_limit=104857600,allowed_mime_types=excluded.allowed_mime_types;

CREATE POLICY eyesite_staging_user_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='eyesite-staging'
  AND (storage.foldername(name))[1]=(SELECT auth.uid()::text)
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.estado='activa')
);
CREATE POLICY eyesite_staging_user_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='eyesite-staging' AND (public.is_admin() OR (storage.foldername(name))[1]=(SELECT auth.uid()::text)));
CREATE POLICY eyesite_staging_user_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='eyesite-staging' AND (storage.foldername(name))[1]=(SELECT auth.uid()::text))
WITH CHECK (bucket_id='eyesite-staging' AND (storage.foldername(name))[1]=(SELECT auth.uid()::text));
CREATE POLICY eyesite_staging_user_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='eyesite-staging' AND (public.is_admin() OR (storage.foldername(name))[1]=(SELECT auth.uid()::text)));
