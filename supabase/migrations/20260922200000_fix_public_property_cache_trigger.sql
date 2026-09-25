-- EYESITE: corrige el trigger de sincronización pública después de renombrar
-- propiedades_publicas_cache -> propiedades_publicas.

create or replace function private.sync_propiedades_publicas_cache()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op = 'DELETE' then
    delete from public.propiedades_publicas where id = old.id;
    return old;
  end if;

  delete from public.propiedades_publicas where id = new.id;

  if new.estado = 'activa' and coalesce(new.activa, true) then
    insert into public.propiedades_publicas (
      id,codigo,titulo,tipo,municipio,ubicacion,direccion,superficie,unidad_superficie,frente,fondo,
      precio_actual,precio_mercado,precio,precio_esperado,unidad_precio,rendimiento,moneda,estatus_legal,
      certeza_legal,destacada,descripcion,descripcion_pro,detalles,caracteristicas,servicios_cercanos,
      fotos,fotos_pro,pdfs,kmz_kml,videos,ubicaciones,tour_360,tipo_portada,portada_url,portada_tipo,
      video_url,construccion_m2,archivos,enlaces,latitud,longitud,activa,estado,orden,created_at,updated_at
    ) values (
      new.id,new.codigo,new.titulo,new.tipo,new.municipio,new.ubicacion,new.direccion,new.superficie,new.unidad_superficie,
      new.frente,new.fondo,new.precio_actual,new.precio_mercado,new.precio,new.precio_esperado,new.unidad_precio,
      new.rendimiento,new.moneda,new.estatus_legal,new.certeza_legal,new.destacada,new.descripcion,new.descripcion_pro,
      new.detalles,new.caracteristicas,new.servicios_cercanos,new.fotos,new.fotos_pro,new.pdfs,new.kmz_kml,new.videos,
      new.ubicaciones,new.tour_360,new.tipo_portada,new.portada_url,new.portada_tipo,new.video_url,new.construccion_m2,
      new.archivos,new.enlaces,new.latitud,new.longitud,new.activa,new.estado,new.orden,new.created_at,new.updated_at
    );
  end if;

  return new;
end;
$function$;