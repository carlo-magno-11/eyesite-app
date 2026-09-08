-- ============================================================
-- MIGRACIÓN: garantizar CHECK constraints de profiles.estado/status
-- Proyecto: xhvpvpvtkdgnnxdwdrkn
-- Sondeo real (scripts/check-profiles.ts, anon key):
--   IDENTIFICADAS clases OK. Este SQL es 100% idempotente y SOLO
--   es necesario SI el SQL Editor muestra un CHECK que impida
--   los valores 'pendiente' | 'activa' | 'rechazado'.
-- ============================================================

-- 1) Ver qué CHECK constraint existe hoy sobre estas columnas
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%estado%' OR pg_get_constraintdef(oid) ILIKE '%status%';

-- 2) Eliminar cualquier CHECK previo sobre las columnas (si existe)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%estado%' OR pg_get_constraintdef(oid) ILIKE '%status%')
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 3) Asegurar los valores permitidos por el onboarding
ALTER TABLE public.profiles ADD CONSTRAINT profiles_estado_check
  CHECK (estado IN ('pendiente', 'activa', 'rechazado'));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pendiente', 'activa', 'rechazado'));

-- 4) Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- 5) Verificación final
-- SELECT estado, status, count(*) FROM public.profiles GROUP BY 1, 2 ORDER BY 1;