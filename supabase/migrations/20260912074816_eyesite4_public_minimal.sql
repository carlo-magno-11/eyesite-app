-- EYESITE 4 — reduce la proyección pública: documentos/metadata interna no salen al cliente.
drop view if exists public.propiedades_publicas;
create view public.propiedades_publicas as
select id,codigo,titulo,tipo,municipio,ubicacion,direccion,superficie,unidad_superficie,frente,fondo,
precio_actual,precio_mercado,precio,precio_esperado,unidad_precio,rendimiento,moneda,
estatus_legal,certeza_legal,destacada,descripcion,descripcion_pro,caracteristicas,servicios_cercanos,
fotos,videos,ubicaciones,tour_360,tipo_portada,portada_url,portada_tipo,video_url,construccion_m2,
activa,estado,orden,created_at,updated_at
from public.propiedades where estado='activa' and coalesce(activa,true)=true;
revoke all on public.propiedades_publicas from public,anon,authenticated;
grant select on public.propiedades_publicas to anon,authenticated;
notify pgrst,'reload schema';
