-- Public view is intentionally owner-executed because the base table is not public.
-- The view exposes only approved public columns and filters active properties.
alter view public.propiedades_publicas set (security_invoker = false);
alter view public.propiedades_publicas set (security_barrier = true);
