-- EYESITE — Restrict realtime change feed to read-only clients
-- 2026-09-21
--
-- The app only needs SELECT on the public change feed. Inserts/updates/deletes
-- are performed by the database trigger as its owner.

revoke all on table public.propiedades_cambios from anon, authenticated;
grant select on table public.propiedades_cambios to anon, authenticated;
