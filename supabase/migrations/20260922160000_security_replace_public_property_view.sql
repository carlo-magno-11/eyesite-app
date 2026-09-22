-- EYESITE: replace SECURITY DEFINER public property view with a public read-only cache table.
-- The cache contains only the columns intentionally exposed by the former public view.
-- Writes remain exclusively through admin RPCs against public.propiedades.

create table if not exists public.propiedades_publicas_cache as
select * from public.propiedades_publicas where false;

alter table public.propiedades_publicas_cache
  add constraint propiedades_publicas_cache_pkey primary key (id);

alter table public.propiedades_publicas_cache enable row level security;

drop policy if exists propiedades_publicas_cache_select on public.propiedades_publicas_cache;
create policy propiedades_publicas_cache_select
on public.propiedades_publicas_cache
for select
to anon, authenticated
using (true);

revoke all on public.propiedades_publicas_cache from public;
grant select on public.propiedades_publicas_cache to anon, authenticated;

insert into public.propiedades_publicas_cache
select * from public.propiedades_publicas
on conflict (id) do update set
  codigo=excluded.codigo, titulo=excluded.titulo, tipo=excluded.tipo, municipio=excluded.municipio,
  ubicacion=excluded.ubicacion, direccion=excluded.direccion, superficie=excluded.superficie,
  unidad_superficie=excluded.unidad_superficie, frente=excluded.frente, fondo=excluded.fondo,
  precio_actual=excluded.precio_actual, precio_mercado=excluded.precio_mercado, precio=excluded.precio,
  precio_esperado=excluded.precio_esperado, unidad_precio=excluded.unidad_precio, rendimiento=excluded.rendimiento,
  moneda=excluded.moneda, estatus_legal=excluded.estatus_legal, certeza_legal=excluded.certeza_legal,
  destacada=excluded.destacada, descripcion=excluded.descripcion, descripcion_pro=excluded.descripcion_pro,
  detalles=excluded.detalles, caracteristicas=excluded.caracteristicas, servicios_cercanos=excluded.servicios_cercanos,
  fotos=excluded.fotos, fotos_pro=excluded.fotos_pro, pdfs=excluded.pdfs, kmz_kml=excluded.kmz_kml,
  videos=excluded.videos, ubicaciones=excluded.ubicaciones, tour_360=excluded.tour_360,
  tipo_portada=excluded.tipo_portada, portada_url=excluded.portada_url, portada_tipo=excluded.portada_tipo,
  video_url=excluded.video_url, construccion_m2=excluded.construccion_m2, archivos=excluded.archivos,
  enlaces=excluded.enlaces, latitud=excluded.latitud, longitud=excluded.longitud, activa=excluded.activa,
  estado=excluded.estado, orden=excluded.orden, created_at=excluded.created_at, updated_at=excluded.updated_at;

create or replace function private.sync_propiedades_publicas_cache()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op = 'DELETE' then
    delete from public.propiedades_publicas_cache where id = old.id;
    return old;
  end if;

  delete from public.propiedades_publicas_cache where id = new.id;

  if new.estado = 'activa' and coalesce(new.activa, true) then
    insert into public.propiedades_publicas_cache (
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

revoke all on function private.sync_propiedades_publicas_cache() from public, anon, authenticated;

drop trigger if exists sync_propiedades_publicas_cache on public.propiedades;
create trigger sync_propiedades_publicas_cache
after insert or update or delete on public.propiedades
for each row execute function private.sync_propiedades_publicas_cache();

drop view public.propiedades_publicas;
alter table public.propiedades_publicas_cache rename to propiedades_publicas;

drop policy if exists propiedades_publicas_cache_select on public.propiedades_publicas;
create policy propiedades_publicas_select
on public.propiedades_publicas
for select
to anon, authenticated
using (true);

revoke all on public.propiedades_publicas from public;
grant select on public.propiedades_publicas to anon, authenticated;
