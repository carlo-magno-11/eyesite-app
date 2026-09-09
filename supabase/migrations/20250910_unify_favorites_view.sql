-- Migration: 20250910_unify_favorites_view.sql
-- Objetivo: unificar property_likes → favoritos.
-- Beneficio: una única tabla física (favoritos) y property_likes pasa a ser una vista
-- que expone propiedad_id por compatibilidad con código existente.
-- Favoritos (tabla real):
--   id uuid, user_id uuid, property_id uuid, created_at timestamp without tz
-- Property_likes (vista):
--   id uuid, user_id uuid, propiedad_id uuid, created_at timestamptz

BEGIN;

DROP VIEW IF EXISTS public.property_likes CASCADE;
DROP TABLE IF EXISTS public.property_likes CASCADE;
DROP VIEW IF EXISTS public.favoritos_view CASCADE;

CREATE OR REPLACE VIEW public.property_likes AS
SELECT
  id,
  user_id,
  property_id AS propiedad_id,
  created_at
FROM public.favoritos;

GRANT SELECT ON public.property_likes TO authenticated, anon;

COMMIT;
