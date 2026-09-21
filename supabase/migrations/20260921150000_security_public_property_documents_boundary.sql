-- EYESITE security hardening: keep the public property boundary read-only
-- and expose approved property document metadata through the public view.
-- The files themselves remain governed by their Storage bucket policies.

DROP VIEW IF EXISTS public.propiedades_publicas;

CREATE VIEW public.propiedades_publicas
WITH (security_invoker = false, security_barrier = true)
AS
SELECT
  id,
  codigo,
  titulo,
  tipo,
  municipio,
  ubicacion,
  direccion,
  superficie,
  unidad_superficie,
  frente,
  fondo,
  precio_actual,
  precio_mercado,
  precio,
  precio_esperado,
  unidad_precio,
  rendimiento,
  moneda,
  estatus_legal,
  certeza_legal,
  destacada,
  descripcion,
  descripcion_pro,
  detalles,
  caracteristicas,
  servicios_cercanos,
  fotos,
  fotos_pro,
  pdfs,
  kmz_kml,
  videos,
  ubicaciones,
  tour_360,
  tipo_portada,
  portada_url,
  portada_tipo,
  video_url,
  construccion_m2,
  archivos,
  enlaces,
  latitud,
  longitud,
  activa,
  estado,
  orden,
  created_at,
  updated_at
FROM public.propiedades
WHERE estado = 'activa'
  AND COALESCE(activa, true) = true;

grant select on public.propiedades_publicas to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.propiedades_publicas from anon, authenticated;

-- The mobile/admin architecture reads properties through controlled views/RPCs.
-- Do not expose the base property table directly to authenticated clients.
revoke select on public.propiedades from authenticated;
