-- EYESITE: enforce active-profile access on user-owned data
-- Suspended/rejected/pending users may still read their profile so AuthGate can route them,
-- but business data and user actions require estado = 'activa'.

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.estado = 'activa' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function private.is_active_user() from public, anon, authenticated;

-- Favorites: only active users may read or mutate their own rows.
drop policy if exists favoritos_select_own on public.favoritos;
create policy favoritos_select_own
on public.favoritos
for select
to authenticated
using (
  (select private.is_active_user())
  and user_id = (select auth.uid())
);

drop policy if exists favoritos_insert_own on public.favoritos;
create policy favoritos_insert_own
on public.favoritos
for insert
to authenticated
with check (
  (select private.is_active_user())
  and user_id = (select auth.uid())
);

drop policy if exists favoritos_delete_own on public.favoritos;
create policy favoritos_delete_own
on public.favoritos
for delete
to authenticated
using (
  (select private.is_active_user())
  and user_id = (select auth.uid())
);

-- Property submissions: only active users may submit or inspect their own requests.
drop policy if exists solicitudes_insert_own on public.solicitudes_propiedades;
create policy solicitudes_insert_own
on public.solicitudes_propiedades
for insert
to authenticated
with check (
  (select private.is_active_user())
  and user_id = (select auth.uid())
);

drop policy if exists solicitudes_select_own_or_admin on public.solicitudes_propiedades;
create policy solicitudes_select_own_or_admin
on public.solicitudes_propiedades
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and user_id = (select auth.uid())
  )
);

-- Profiles: keep self-SELECT available for AuthGate, but block profile edits once inactive.
drop policy if exists profiles_update_authenticated on public.profiles;
create policy profiles_update_authenticated
on public.profiles
for update
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and id = (select auth.uid())
  )
)
with check (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and id = (select auth.uid())
    and coalesce(role, 'user') = coalesce(
      (select private.current_profile_role((select auth.uid()))),
      'user'
    )
    and coalesce(estado, 'pendiente') = coalesce(
      (select private.current_profile_estado((select auth.uid()))),
      'pendiente'
    )
  )
);

-- Notifications: active users see only their own notifications; admins keep access.
drop policy if exists notificaciones_select_own on public.notificaciones;
create policy notificaciones_select_own
on public.notificaciones
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and user_id = (select auth.uid())
  )
);

-- Announcement delivery analytics: active users may see only their own delivery rows.
drop policy if exists anuncio_entregas_select_own_or_admin on public.anuncio_entregas;
create policy anuncio_entregas_select_own_or_admin
on public.anuncio_entregas
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and user_id = (select auth.uid())
  )
);

-- User notification actions must also stop working for inactive users.
create or replace function public.marcar_notificacion_leida(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not (select private.is_active_user()) then
    return false;
  end if;

  update public.notificaciones
  set leida = true
  where id = p_notification_id
    and user_id = auth.uid();

  return found;
end;
$function$;

create or replace function public.marcar_todas_notificaciones_leidas()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  affected integer;
begin
  if not (select private.is_active_user()) then
    return 0;
  end if;

  update public.notificaciones
  set leida = true
  where user_id = auth.uid()
    and leida = false;

  get diagnostics affected = row_count;
  return affected;
end;
$function$;

create or replace function public.registrar_anuncio_evento(
  p_announcement_id uuid,
  p_evento text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not (select private.is_active_user()) then
    return false;
  end if;

  if p_evento not in ('opened','clicked') then
    raise exception 'Evento no permitido';
  end if;

  if not exists (
    select 1
    from public.anuncios a
    where a.id = p_announcement_id
      and (a.estado_publicacion = 'publicado' or a.activa = true)
  ) then
    return false;
  end if;

  insert into public.anuncio_entregas (anuncio_id,user_id)
  values (p_announcement_id, auth.uid())
  on conflict (anuncio_id,user_id) do nothing;

  if p_evento = 'opened' then
    update public.anuncio_entregas
    set opened_at = coalesce(opened_at, now()), updated_at = now()
    where anuncio_id = p_announcement_id and user_id = auth.uid();
  else
    update public.anuncio_entregas
    set clicked_at = coalesce(clicked_at, now()), updated_at = now()
    where anuncio_id = p_announcement_id and user_id = auth.uid();
  end if;

  return true;
end;
$function$;

revoke all on function public.marcar_notificacion_leida(uuid) from public, anon;
grant execute on function public.marcar_notificacion_leida(uuid) to authenticated;

revoke all on function public.marcar_todas_notificaciones_leidas() from public, anon;
grant execute on function public.marcar_todas_notificaciones_leidas() to authenticated;

revoke all on function public.registrar_anuncio_evento(uuid,text) from public, anon;
grant execute on function public.registrar_anuncio_evento(uuid,text) to authenticated;
