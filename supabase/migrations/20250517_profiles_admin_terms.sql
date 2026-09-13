-- ============================================================
-- MIGRACIÓN: profiles — columnas para Admin Users + Términos
-- Proyecto activo: xhvpvpvtkdgnnxdwdrkn
-- Basada en /tmp/schema_real.txt (sondeo real con anon key):
--   profiles ACTUALMENTE tiene: id, email, role, nombre, telefono, estado,
--   terminos_aceptados, terminos_fecha
--   FALTAN: full_name, phone, status, created_at, updated_at, last_login_at
-- ESTADO: NO EJECUTADA. Pegar y ejecutar completo en Supabase SQL Editor.
-- Idempotente: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- ============================================================

-- Admin Users (app/admin/users.tsx) usa: full_name, phone, status, created_at
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Términos y condiciones (app/terms.tsx) — ya existen en la BD real; IF NOT EXISTS inofensivo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terminos_aceptados boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terminos_fecha timestamptz;

-- Índices (TAREA 1)
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON profiles(estado);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

-- Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación (descomentar en SQL Editor):
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='profiles' ORDER BY 1;