-- ============================================================
-- MIGRACIÓN: Sincronizar solicitudes_propiedades y profiles
-- Proyecto activo: xhvpvpvtkdgnnxdwdrkn
-- Basada en sondeo real con anon key (PostgREST select=<col>, 2025-09)
-- ESTADO: NO EJECUTADA. Pegar y ejecutar completo en Supabase SQL Editor.
-- Idempotente: re-ejecutable sin error.
-- ============================================================

-- ── solicitudes_propiedades: columnas que la app ESCRIBE y faltaban ──
-- use-property-submissions.ts:87,124 y app/admin/solicitud/[id].tsx:184,253 -> updated_at
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- app/admin/solicitudes.tsx:49 -> motivo_rechazo
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS motivo_rechazo text;

-- hooks/use-submit-property.ts -> precio_esperado (alias del precio esperado, como en propiedades)
ALTER TABLE public.solicitudes_propiedades ADD COLUMN IF NOT EXISTS precio_esperado numeric;

-- Backfill idempotente
UPDATE public.solicitudes_propiedades SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.solicitudes_propiedades SET precio_esperado = precio_actual WHERE precio_esperado IS NULL AND precio_actual IS NOT NULL;

-- ── profiles: columnas que la app CONSULTA (admin-dashboard) y faltaban ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- (No se crean full_name/avatar_url: NADIE las pide en el código. Regla de oro.)

-- Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación (descomentar en SQL Editor)
-- SELECT table_name, column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public'
--   AND ((table_name='solicitudes_propiedades' AND column_name IN ('updated_at','motivo_rechazo','precio_esperado'))
--     OR (table_name='profiles' AND column_name IN ('created_at','last_login_at')))
-- ORDER BY table_name, column_name;