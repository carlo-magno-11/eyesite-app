-- ============================================================
-- MIGRACIÓN: Sincronizar columnas de propiedades con lo que la app usa
-- Proyecto activo: xhvpvpvtkdgnnxdwdrkn
-- Origen: escaneo de TODOS los .from('propiedades') del código
--        (app/admin/*, hooks/use-properties.ts, hooks/use-property-submissions.ts,
--          public/admin.js)
-- ESTADO: NO EJECUTADA. Pegar y ejecutar completo en Supabase SQL Editor.
-- Idempotente: ADD COLUMN IF NOT EXISTS permite re-ejecutar sin error.
-- ============================================================

-- ── 1. ESCRITAS por la app y FALTANTES (inserts que fallan sin ellas) ──

-- app/admin/solicitud/[id].tsx:209 y hooks/use-property-submissions.ts:104 -> activa: true
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true;

-- app/admin/solicitud/[id].tsx:211 y hooks/use-property-submissions.ts:106 -> orden: 0
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS orden integer DEFAULT 0;

-- app/admin/solicitudes.tsx:30 -> precio: sol.precio (alias legacy de precio_actual)
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS precio numeric;

-- app/admin/solicitudes.tsx:32 -> ubicacion: sol.ubicacion (alias legacy de ubicaciones)
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS ubicacion text;

-- app/admin/solicitudes.tsx:33 -> imagenes: sol.imagenes (alias legacy de fotos)
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;

-- ── 2. LEÍDAS por la app y FALTANTES (lectura con fallback, no crashean, pero la app las pide) ──

-- hooks/use-properties.ts:37 mapProperty -> raw.codigo (código visible de la propiedad)
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS codigo text;

-- hooks/use-properties.ts:40 mapProperty -> raw.construccion_m2
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS construccion_m2 numeric;

-- public/admin.js:161 vista de propiedad -> p.contacto_email
ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS contacto_email text;

-- ── 3. BACKFILL razonable para las 2 filas existentes (idempotente) ──
UPDATE public.propiedades SET precio = precio_actual WHERE precio IS NULL AND precio_actual IS NOT NULL;
UPDATE public.propiedades SET ubicacion = municipio WHERE ubicacion IS NULL AND municipio IS NOT NULL;
UPDATE public.propiedades SET codigo = left(id::text, 6) WHERE codigo IS NULL;
UPDATE public.propiedades SET imagenes = to_jsonb(fotos) WHERE fotos IS NOT NULL AND (imagenes IS NULL OR imagenes = '[]'::jsonb);
UPDATE public.propiedades SET activa = true WHERE activa IS NULL;

-- ── 4. Recargar caché de esquema de PostgREST (OBLIGATORIO tras ALTER TABLE) ──
NOTIFY pgrst, 'reload schema';

-- ── 5. Verificación (descomentar para revisar en SQL Editor) ──
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='propiedades'
--   AND column_name IN ('activa','orden','precio','ubicacion','imagenes','codigo','construccion_m2','contacto_email')
-- ORDER BY column_name;