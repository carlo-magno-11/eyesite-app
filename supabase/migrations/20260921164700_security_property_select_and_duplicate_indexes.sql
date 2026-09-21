-- EYESITE security/performance hardening
-- 2026-09-21
--
-- Keep the base property table behind controlled views/RPCs.
-- Remove only confirmed duplicate indexes; retain useful indexes.

REVOKE SELECT ON TABLE public.propiedades FROM authenticated;
REVOKE SELECT ON TABLE public.propiedades FROM anon;

DROP INDEX IF EXISTS public.favoritos_user_property_unique;
DROP INDEX IF EXISTS public.ux_notificaciones_event_key;
DROP INDEX IF EXISTS public.idx_profiles_created_at;
