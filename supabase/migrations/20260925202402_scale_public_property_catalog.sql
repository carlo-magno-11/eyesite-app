-- EYESITE — Índices del catálogo público paginado
-- Mantiene la consulta pública en propiedades_publicas y acelera orden/filtros
-- sin abrir acceso directo a propiedades.

create index if not exists idx_propiedades_publicas_catalog_created
  on public.propiedades_publicas (created_at desc)
  where estado = 'activa' and activa = true;

create index if not exists idx_propiedades_publicas_catalog_tipo_created
  on public.propiedades_publicas (tipo, created_at desc)
  where estado = 'activa' and activa = true;

create index if not exists idx_propiedades_publicas_catalog_price
  on public.propiedades_publicas (precio_actual)
  where estado = 'activa' and activa = true;

create index if not exists idx_propiedades_publicas_catalog_surface
  on public.propiedades_publicas (superficie)
  where estado = 'activa' and activa = true;
