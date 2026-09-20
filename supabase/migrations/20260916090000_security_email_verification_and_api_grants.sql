-- EYESITE security hardening: API grants + email verification gate
-- Date: 2026-09-16

revoke select, insert, update, delete, truncate, references, trigger
  on table public.propiedades
  from anon, authenticated;

revoke all privileges on table public.anuncios from anon;

revoke update on table public.notificaciones from authenticated;
revoke execute on function public.marcar_notificacion_leida(uuid) from anon;
revoke execute on function public.marcar_todas_notificaciones_leidas() from anon;
grant execute on function public.marcar_notificacion_leida(uuid) to authenticated;
grant execute on function public.marcar_todas_notificaciones_leidas() to authenticated;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.eyesite_audit_trigger() from anon, authenticated;
revoke execute on function public.eyesite_price_drop_notification() from anon, authenticated;
revoke execute on function public.sync_propiedad_publication_status() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

create or replace function public.admin_approve_profile(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_profile public.profiles%rowtype;
  v_confirmed_at timestamptz;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if v_profile.role = 'admin' then raise exception 'No se puede modificar el estado de un administrador'; end if;

  select email_confirmed_at into v_confirmed_at from auth.users where id = p_profile_id;
  if v_confirmed_at is null then raise exception 'El correo del usuario todavía no está verificado'; end if;

  update public.profiles
  set estado='activa', status='activa', updated_at=now()
  where id=p_profile_id;

  return jsonb_build_object('ok',true,'id',p_profile_id,'estado','activa');
end;
$function$;

grant execute on function public.admin_approve_profile(uuid) to authenticated;

create index if not exists idx_solicitudes_propiedad_id
  on public.solicitudes_propiedades(propiedad_id);
