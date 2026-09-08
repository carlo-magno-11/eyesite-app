-- ============================================================
-- MIGRACIÓN V5 FINAL: Video + Foto conviven (nunca se borran)
-- Proyecto activo: xhvpvpvtkdgnnxdwdrkn
-- ESTADO: NO EJECUTADA. Pegar y ejecutar completo en Supabase SQL Editor.
-- Idempotente: ADD COLUMN IF NOT EXISTS permite re-ejecutar sin error.
-- ============================================================

ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS portada_url text;
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS tipo_portada text DEFAULT 'foto';
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS precio_esperado numeric;

ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS portada_url text;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS tipo_portada text DEFAULT 'foto';
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS precio_esperado numeric;
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS motivo_rechazo text;

-- Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación (descomentar en SQL Editor):
-- SELECT * FROM propiedades LIMIT 1;
-- SELECT * FROM solicitudes_propiedades LIMIT 1;
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE table_schema='public'
--   AND column_name IN ('videos','video_url','portada_url','tipo_portada','precio_esperado','updated_at','motivo_rechazo')
-- ORDER BY table_name, column_name;