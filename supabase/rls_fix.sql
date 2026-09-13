-- =============================================
-- FIX RLS: Permitir lectura pública de propiedades activas
-- =============================================

-- Elimina policies existentes que bloqueen anon
DROP POLICY IF EXISTS "public read activa" ON propiedades;
DROP POLICY IF EXISTS "Enable read access for all users" ON propiedades;
DROP POLICY IF EXISTS "anon read propiedades" ON propiedades;

-- Crea la policy que permite a anon leer SOLO propiedades con estado='activa'
CREATE POLICY "public read activa" ON propiedades
  FOR SELECT
  USING (estado = 'activa');

-- Asegura que RLS esté habilitado (con la policy para anon)
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Verificación: debería devolver las propiedades activas
-- SELECT id, titulo, estado FROM propiedades WHERE estado = 'activa';