-- EYESITE Commercial CRM Phase 1
-- Automatic in-app alerts for active saved searches when a published property matches.

create or replace function public.notify_saved_search_matches()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_price numeric := coalesce(new.precio_actual, new.precio, 0);
  v_surface numeric := coalesce(new.superficie, 0);
  v_search record;
  v_notification_id uuid;
begin
  if new.estado <> 'activa' or coalesce(new.activa, true) = false then
    return new;
  end if;

  for v_search in
    select
      ss.id,
      ss.user_id
    from public.saved_searches ss
    join public.profiles pr on pr.id = ss.user_id
    where ss.activa = true
      and pr.estado = 'activa'
      and (ss.min_price is null or v_price >= ss.min_price)
      and (ss.max_price is null or v_price <= ss.max_price)
      and (ss.min_surface is null or v_surface >= ss.min_surface)
      and (ss.max_surface is null or v_surface <= ss.max_surface)
      and (
        ss.municipio is null
        or btrim(ss.municipio) = ''
        or lower(coalesce(new.municipio, '')) like '%' || lower(btrim(ss.municipio)) || '%'
        or lower(btrim(ss.municipio)) like '%' || lower(coalesce(new.municipio, '')) || '%'
      )
      and (
        ss.tipo is null
        or btrim(ss.tipo) = ''
        or lower(coalesce(new.tipo, '')) = lower(btrim(ss.tipo))
        or lower(coalesce(new.tipo, '')) like '%' || lower(btrim(ss.tipo)) || '%'
      )
  loop
    v_notification_id := public.crear_notificacion_evento(
      v_search.user_id,
      'Nueva propiedad compatible',
      coalesce(new.titulo, 'Encontramos una propiedad que coincide con tu búsqueda.'),
      'property_match',
      'saved_search_match:' || v_search.id::text || ':' || new.id::text,
      jsonb_build_object(
        'property_id', new.id,
        'saved_search_id', v_search.id,
        'titulo', new.titulo,
        'precio', v_price,
        'superficie', v_surface,
        'municipio', new.municipio,
        'tipo', new.tipo
      )
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_saved_search_matches() from public, anon, authenticated;

drop trigger if exists trg_notify_saved_search_matches on public.propiedades;
create trigger trg_notify_saved_search_matches
after insert or update of estado, activa, precio_actual, precio, superficie, municipio, tipo
on public.propiedades
for each row
execute function public.notify_saved_search_matches();

comment on function public.notify_saved_search_matches() is
  'Creates idempotent in-app notifications when an active property matches a saved search.';
