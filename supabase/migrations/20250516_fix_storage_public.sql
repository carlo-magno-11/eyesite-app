-- ============================================================
-- MIGRACIÓN V6.3: Bucket eyesite-media PÚBLICO (fix video 00:00 negro)
-- Proyecto activo: xhvpvpvtkdgnnxdwdrkn
-- ESTADO: NO EJECUTADA. Pegar y ejecutar completo en Supabase SQL Editor.
-- (npx supabase db push requiere CLI linked + token; SQL Editor es equivalente)
-- ============================================================

-- 1) Hacer público el bucket (los <Video>/<Image> necesitan URL pública sin login)
UPDATE storage.buckets SET public = true WHERE id = 'eyesite-media';

-- 2) Policy pública de lectura para ese bucket (idempotente)
DROP POLICY IF EXISTS "public read" ON storage.objects;
CREATE POLICY "public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'eyesite-media');

-- 3) Verificación (descomentar en SQL Editor):
-- SELECT id, public FROM storage.buckets WHERE id = 'eyesite-media';  -- public = true
-- SELECT policyname, cmd FROM pg_policies
--  WHERE schemaname='storage' AND tablename='objects' AND policyname='public read';

-- NOTA: después de ejecutar, prueba en incógnito:
-- https://xhvpvpvtkdgnnxdwdrkn.supabase.co/storage/v1/object/public/eyesite-media/videos/TU_ARCHIVO.mp4
-- Debe reproducir/descargar SIN login. (404 = bucket público y archivo no existe; 400 = aún privado)