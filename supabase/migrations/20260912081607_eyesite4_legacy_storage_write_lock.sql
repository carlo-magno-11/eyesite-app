-- EYESITE 4 — legacy storage buckets are read-only for normal users.
DROP POLICY IF EXISTS "fotos authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "fotos authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "fotos authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "fotos_propiedades_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "fotos_propiedades_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "fotos_propiedades_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "pdfs authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "pdfs authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "pdfs authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "kmz_kml authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "kmz_kml authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "kmz_kml authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "videos authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "videos authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "videos authenticated update" ON storage.objects;
CREATE POLICY eyesite_legacy_admin_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('fotos','fotos-propiedades','pdfs','kmz_kml','videos','documentos') AND public.is_admin());
CREATE POLICY eyesite_legacy_admin_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('fotos','fotos-propiedades','pdfs','kmz_kml','videos','documentos') AND public.is_admin())
WITH CHECK (bucket_id IN ('fotos','fotos-propiedades','pdfs','kmz_kml','videos','documentos') AND public.is_admin());
CREATE POLICY eyesite_legacy_admin_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('fotos','fotos-propiedades','pdfs','kmz_kml','videos','documentos') AND public.is_admin());
