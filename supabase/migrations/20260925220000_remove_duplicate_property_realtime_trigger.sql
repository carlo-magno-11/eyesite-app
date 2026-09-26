-- EYESITE: remove duplicate property realtime invalidation trigger.
-- The canonical trigger is trg_propiedades_cambios -> notify_propiedad_change().
-- The legacy trg_propiedades_cambio -> emit_propiedad_cambio() wrote to the
-- same unique propiedades_cambios.property_id row, causing duplicate realtime
-- activity for every property mutation. The legacy function is retained for
-- compatibility/history but is no longer attached as a trigger.

drop trigger if exists trg_propiedades_cambio on public.propiedades;
