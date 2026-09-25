-- EYESITE: scale catalog text search
-- Supports ILIKE '%term%' filters used by the public catalog.
-- Keep this additive: no existing indexes are removed.

create index if not exists idx_propiedades_catalog_titulo_trgm
  on public.propiedades using gin (lower(titulo) gin_trgm_ops);

create index if not exists idx_propiedades_catalog_municipio_trgm
  on public.propiedades using gin (lower(municipio) gin_trgm_ops);

create index if not exists idx_propiedades_catalog_ubicacion_trgm
  on public.propiedades using gin (lower(ubicacion) gin_trgm_ops);

comment on index public.idx_propiedades_catalog_titulo_trgm
  is 'EYESITE catalog substring search on property title';

comment on index public.idx_propiedades_catalog_municipio_trgm
  is 'EYESITE catalog substring search on municipality';

comment on index public.idx_propiedades_catalog_ubicacion_trgm
  is 'EYESITE catalog substring search on location';
