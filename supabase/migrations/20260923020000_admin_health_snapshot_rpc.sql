create or replace function public.admin_health_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'profiles', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'active', (select count(*) from public.profiles where estado = 'activa'),
      'pending', (select count(*) from public.profiles where estado = 'pendiente'),
      'rejected_or_suspended', (select count(*) from public.profiles where estado in ('rechazado','suspendida'))
    ),
    'properties', jsonb_build_object(
      'total', (select count(*) from public.propiedades),
      'active', (select count(*) from public.propiedades where coalesce(activa,false) = true),
      'with_coordinates', (select count(*) from public.propiedades where latitud is not null and longitud is not null),
      'public_cache', (select count(*) from public.propiedades_publicas)
    ),
    'requests', jsonb_build_object(
      'pending', (select count(*) from public.solicitudes_propiedades where lower(coalesce(estado,status,'')) = 'pendiente')
    ),
    'notifications', jsonb_build_object(
      'total', (select count(*) from public.notificaciones),
      'unread', (select count(*) from public.notificaciones where coalesce(leida,false) = false),
      'last_created_at', (select max(created_at) from public.notificaciones)
    ),
    'announcements', jsonb_build_object(
      'total', (select count(*) from public.anuncios),
      'published', (select count(*) from public.anuncios where estado_publicacion = 'publicado' and activa = true)
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_health_snapshot() from public;
revoke execute on function public.admin_health_snapshot() from anon;
grant execute on function public.admin_health_snapshot() to authenticated;
