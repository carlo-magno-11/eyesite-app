-- EYESITE Commercial CRM
-- Cover the prospecto_actividades.property_id foreign key for property-centric activity queries
-- and to avoid FK maintenance scans as the CRM grows.
create index if not exists prospecto_actividades_property_idx
  on public.prospecto_actividades(property_id, created_at desc);
