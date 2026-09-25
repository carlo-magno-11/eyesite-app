-- EYESITE: notify a user when an admin approves the account.
-- Safe/idempotent behavior: only the transition into activa creates the notification.
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
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select *
    into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if v_profile.role = 'admin' then
    raise exception 'No se puede modificar el estado de un administrador';
  end if;

  select email_confirmed_at
    into v_confirmed_at
  from auth.users
  where id = p_profile_id;

  if v_confirmed_at is null then
    raise exception 'El correo del usuario todavía no está verificado';
  end if;

  update public.profiles
  set estado = 'activa',
      status = 'activa',
      updated_at = now()
  where id = p_profile_id;

  if coalesce(v_profile.estado, '') <> 'activa' then
    perform public.crear_notificacion_evento(
      p_profile_id,
      'Cuenta aprobada',
      'Tu cuenta de EYESITE fue aprobada. Ya puedes entrar y utilizar la aplicación.',
      'informacion',
      'profile-approved:' || p_profile_id::text,
      jsonb_build_object('profile_status', 'activa')
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', p_profile_id,
    'estado', 'activa'
  );
end;
$function$;

revoke all on function public.admin_approve_profile(uuid) from anon;
grant execute on function public.admin_approve_profile(uuid) to authenticated;
