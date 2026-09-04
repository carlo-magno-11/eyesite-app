-- =============================================
-- RLS STORAGE: Políticas para buckets de media
-- Buckets: fotos, videos, pdfs, kmz_kml
-- SELECT público (anon), INSERT/UPDATE/DELETE solo authenticated/service_role
-- No borra buckets, solo crea policies
-- =============================================

-- Asegura que los buckets existan (no los borra si ya existen)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('kmz_kml', 'kmz_kml', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- POLICIES PARA BUCKET: fotos
-- =============================================
DROP POLICY IF EXISTS "fotos public read" ON storage.objects;
CREATE POLICY "fotos public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'fotos');

DROP POLICY IF EXISTS "fotos authenticated insert" ON storage.objects;
CREATE POLICY "fotos authenticated insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fotos');

DROP POLICY IF EXISTS "fotos authenticated update" ON storage.objects;
CREATE POLICY "fotos authenticated update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fotos');

DROP POLICY IF EXISTS "fotos authenticated delete" ON storage.objects;
CREATE POLICY "fotos authenticated delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'fotos');

-- =============================================
-- POLICIES PARA BUCKET: videos
-- =============================================
DROP POLICY IF EXISTS "videos public read" ON storage.objects;
CREATE POLICY "videos public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "videos authenticated insert" ON storage.objects;
CREATE POLICY "videos authenticated insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');

DROP POLICY IF EXISTS "videos authenticated update" ON storage.objects;
CREATE POLICY "videos authenticated update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "videos authenticated delete" ON storage.objects;
CREATE POLICY "videos authenticated delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos');

-- =============================================
-- POLICIES PARA BUCKET: pdfs
-- =============================================
DROP POLICY IF EXISTS "pdfs public read" ON storage.objects;
CREATE POLICY "pdfs public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pdfs');

DROP POLICY IF EXISTS "pdfs authenticated insert" ON storage.objects;
CREATE POLICY "pdfs authenticated insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdfs');

DROP POLICY IF EXISTS "pdfs authenticated update" ON storage.objects;
CREATE POLICY "pdfs authenticated update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pdfs');

DROP POLICY IF EXISTS "pdfs authenticated delete" ON storage.objects;
CREATE POLICY "pdfs authenticated delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdfs');

-- =============================================
-- POLICIES PARA BUCKET: kmz_kml
-- =============================================
DROP POLICY IF EXISTS "kmz_kml public read" ON storage.objects;
CREATE POLICY "kmz_kml public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'kmz_kml');

DROP POLICY IF EXISTS "kmz_kml authenticated insert" ON storage.objects;
CREATE POLICY "kmz_kml authenticated insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kmz_kml');

DROP POLICY IF EXISTS "kmz_kml authenticated update" ON storage.objects;
CREATE POLICY "kmz_kml authenticated update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kmz_kml');

DROP POLICY IF EXISTS "kmz_kml authenticated delete" ON storage.objects;
CREATE POLICY "kmz_kml authenticated delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'kmz_kml');

-- =============================================
-- POLICIES PARA BUCKET: eyesite-media (legacy)
-- =============================================
DROP POLICY IF EXISTS "eyesite-media public read" ON storage.objects;
CREATE POLICY "eyesite-media public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'eyesite-media');

DROP POLICY IF EXISTS "eyesite-media authenticated insert" ON storage.objects;
CREATE POLICY "eyesite-media authenticated insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'eyesite-media');

DROP POLICY IF EXISTS "eyesite-media authenticated update" ON storage.objects;
CREATE POLICY "eyesite-media authenticated update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'eyesite-media');

DROP POLICY IF EXISTS "eyesite-media authenticated delete" ON storage.objects;
CREATE POLICY "eyesite-media authenticated delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'eyesite-media');

-- Verificación
-- SELECT bucket_id, policyname, operation FROM pg_policies WHERE schemaname='storage' ORDER BY bucket_id;