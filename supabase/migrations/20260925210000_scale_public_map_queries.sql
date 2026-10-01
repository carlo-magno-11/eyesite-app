-- EYESITE map scalability: geographic server-side filtering.
-- The client continues to read only the public catalog boundary
-- (propiedades_publicas); this RPC is SECURITY INVOKER and returns
-- only lightweight map fields.

create or replace function public.get_public_map_properties(
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision default 250,
  p_limit integer default 500
)
returns table(
  id uuid,
  titulo text,
  municipio text,
  ubicacion text,
  precio_actual numeric,
  unidad_precio text,
  latitud double precision,
  longitud double precision
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with bounds as (
    select
      greatest(-90.0, p_lat - p_radius_km / 111.32) as min_lat,
      least(90.0, p_lat + p_radius_km / 111.32) as max_lat,
      greatest(
        -180.0,
        p_lon - p_radius_km / (111.32 * greatest(cos(radians(p_lat)), 0.01))
      ) as min_lon,
      least(
        180.0,
        p_lon + p_radius_km / (111.32 * greatest(cos(radians(p_lat)), 0.01))
      ) as max_lon
  ),
  candidates as (
    select
      p.id,
      p.titulo,
      p.municipio,
      p.ubicacion,
      p.precio_actual,
      p.unidad_precio,
      p.latitud,
      p.longitud,
      p.orden,
      p.created_at
    from public.propiedades_publicas p
    cross join bounds b
    where p.estado = 'activa'
      and p.activa = true
      and p.latitud between b.min_lat and b.max_lat
      and p.longitud between b.min_lon and b.max_lon
  )
  select
    c.id,
    c.titulo,
    c.municipio,
    c.ubicacion,
    c.precio_actual,
    c.unidad_precio,
    c.latitud,
    c.longitud
  from candidates c
  where 6371.0 * 2.0 * asin(
    least(
      1.0,
      sqrt(
        power(sin(radians(c.latitud - p_lat) / 2.0), 2)
        + cos(radians(p_lat))
          * cos(radians(c.latitud))
          * power(sin(radians(c.longitud - p_lon) / 2.0), 2)
      )
    )
  ) <= greatest(1.0, least(p_radius_km, 500.0))
  order by
    6371.0 * 2.0 * asin(
      least(
        1.0,
        sqrt(
          power(sin(radians(c.latitud - p_lat) / 2.0), 2)
          + cos(radians(p_lat))
            * cos(radians(c.latitud))
            * power(sin(radians(c.longitud - p_lon) / 2.0), 2)
        )
      )
    ),
    c.orden nulls last,
    c.created_at desc nulls last
  limit greatest(1, least(p_limit, 500));
$$;

create index if not exists idx_propiedades_publicas_map_coords
  on public.propiedades_publicas (latitud, longitud)
  where estado = 'activa'
    and activa = true
    and latitud is not null
    and longitud is not null;

revoke all on function public.get_public_map_properties(
  double precision, double precision, double precision, integer
) from public;

grant execute on function public.get_public_map_properties(
  double precision, double precision, double precision, integer
) to anon, authenticated;
