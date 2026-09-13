-- =============================================
-- MIGRACIÓN: Estandarizar columnas de propiedades
-- Nombres estándar: fotos, videos, ubicaciones, pdfs, kmz_kml, tipo_portada
-- No falla si las columnas ya existen (usa DO $$ ... IF NOT EXISTS)
-- =============================================

-- Asegura que la tabla propiedades tenga las columnas estándar
DO $$
BEGIN
  -- fotos (estándar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='fotos') THEN
    ALTER TABLE public.propiedades ADD COLUMN fotos JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- videos (estándar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='videos') THEN
    ALTER TABLE public.propiedades ADD COLUMN videos JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- ubicaciones (estándar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='ubicaciones') THEN
    ALTER TABLE public.propiedades ADD COLUMN ubicaciones JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- pdfs (estándar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='pdfs') THEN
    ALTER TABLE public.propiedades ADD COLUMN pdfs JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- kmz_kml (estándar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='kmz_kml') THEN
    ALTER TABLE public.propiedades ADD COLUMN kmz_kml JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- tipo_portada (estándar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='tipo_portada') THEN
    ALTER TABLE public.propiedades ADD COLUMN tipo_portada TEXT DEFAULT 'foto';
  END IF;

  -- portada_url (estándar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='portada_url') THEN
    ALTER TABLE public.propiedades ADD COLUMN portada_url TEXT;
  END IF;
END $$;

-- Migrar datos de columnas antiguas a las estándar (si existen)
DO $$
BEGIN
  -- Migrar video_links -> videos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='video_links') THEN
    UPDATE public.propiedades SET videos = video_links WHERE video_links IS NOT NULL AND (videos IS NULL OR videos = '[]'::jsonb);
  END IF;

  -- Migrar maps_links -> ubicaciones
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='maps_links') THEN
    UPDATE public.propiedades SET ubicaciones = maps_links WHERE maps_links IS NOT NULL AND (ubicaciones IS NULL OR ubicaciones = '[]'::jsonb);
  END IF;

  -- Migrar kmz_files -> kmz_kml
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='kmz_files') THEN
    UPDATE public.propiedades SET kmz_kml = kmz_files WHERE kmz_files IS NOT NULL AND (kmz_kml IS NULL OR kmz_kml = '[]'::jsonb);
  END IF;

  -- Migrar fotos_pro -> fotos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' AND column_name='fotos_pro') THEN
    UPDATE public.propiedades SET fotos = fotos_pro WHERE fotos_pro IS NOT NULL AND (fotos IS NULL OR fotos = '[]'::jsonb);
  END IF;
END $$;

-- Verificación
-- SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='propiedades' ORDER BY ordinal_position;