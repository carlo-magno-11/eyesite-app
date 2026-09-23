-- EYESITE: automatic in-app communications for user-visible lifecycle events
create or replace function public.notify_property_request_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is not null then
    perform public.crear_notificacion_evento(
      new.user_id,
      'Solicitud recibida',
      'Recibimos tu solicitud de propiedad. Quedará en revisión por EYESITE.',
      'solicitud',
      'property-request-created:' || new.id::text,
      jsonb_build_object('request_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_property_request_created on public.solicitudes_propiedades;
create trigger trg_notify_property_request_created
after insert on public.solicitudes_propiedades
for each row execute function public.notify_property_request_created();

create or replace function public.admin_reject_profile(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_profile public.profiles%rowtype;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if v_profile.role = 'admin' then raise exception 'No se puede modificar el estado de un administrador'; end if;
  update public.profiles set estado='rechazado', status='rechazado', updated_at=now() where id=p_profile_id;
  if coalesce(v_profile.estado,'') <> 'rechazado' then
    perform public.crear_notificacion_evento(
      p_profile_id,
      'Cuenta no aprobada',
      'Tu cuenta de EYESITE no fue aprobada. Revisa la información de tu perfil o contacta a EYESITE.',
      'cuenta',
      'profile-rejected:' || p_profile_id::text,
      jsonb_build_object('profile_status','rechazado')
    );
  end if;
  return jsonb_build_object('ok',true,'id',p_profile_id,'estado','rechazado');
end;
$$;

create or replace function public.admin_suspend_profile(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_profile public.profiles%rowtype;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if p_profile_id = auth.uid() then raise exception 'No puedes suspender tu propio perfil'; end if;
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if v_profile.role = 'admin' then raise exception 'No se puede suspender un administrador'; end if;
  update public.profiles set estado='suspendida', status='suspendida', updated_at=now() where id=p_profile_id;
  if coalesce(v_profile.estado,'') <> 'suspendida' then
    perform public.crear_notificacion_evento(
      p_profile_id,
      'Cuenta suspendida',
      'Tu cuenta de EYESITE fue suspendida temporalmente. Contacta a EYESITE si necesitas asistencia.',
      'cuenta',
      'profile-suspended:' || p_profile_id::text,
      jsonb_build_object('profile_status','suspendida')
    );
  end if;
  return jsonb_build_object('ok',true,'id',p_profile_id,'estado','suspendida');
end;
$$;

create or replace function public.admin_activate_property(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_property public.propiedades%rowtype; v_admin_id uuid := auth.uid();
begin
  if v_admin_id is null or not public.is_admin() then raise exception 'Solo administradores pueden activar propiedades' using errcode='42501'; end if;
  select * into v_property from public.propiedades where id=p_property_id for update;
  if not found then raise exception 'Propiedad no encontrada'; end if;
  update public.propiedades set estado='activa', status='activa', activa=true, updated_at=now() where id=p_property_id;
  if v_property.user_id is not null and (coalesce(v_property.estado,'') <> 'activa' or coalesce(v_property.activa,false) <> true) then
    perform public.crear_notificacion_evento(
      v_property.user_id,
      'Propiedad activada',
      format('La propiedad "%s" está activa nuevamente en EYESITE.', coalesce(v_property.titulo,'Sin título')),
      'propiedad',
      'property-activated:' || p_property_id::text || ':' || to_char(now(),'YYYYMMDDHH24MISSMS'),
      jsonb_build_object('property_id',p_property_id)
    );
  end if;
  return jsonb_build_object('ok',true,'id',p_property_id,'estado','activa','activa',true);
end;
$$;

create or replace function public.admin_deactivate_property(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_property public.propiedades%rowtype; v_admin_id uuid := auth.uid();
begin
  if v_admin_id is null or not public.is_admin() then raise exception 'Solo administradores pueden desactivar propiedades' using errcode='42501'; end if;
  select * into v_property from public.propiedades where id=p_property_id for update;
  if not found then raise exception 'Propiedad no encontrada'; end if;
  update public.propiedades set estado='inactiva', status='inactiva', activa=false, updated_at=now() where id=p_property_id;
  if v_property.user_id is not null and (coalesce(v_property.estado,'') = 'activa' or coalesce(v_property.activa,true) = true) then
    perform public.crear_notificacion_evento(
      v_property.user_id,
      'Propiedad desactivada',
      format('La propiedad "%s" dejó de estar publicada temporalmente en EYESITE.', coalesce(v_property.titulo,'Sin título')),
      'propiedad',
      'property-deactivated:' || p_property_id::text || ':' || to_char(now(),'YYYYMMDDHH24MISSMS'),
      jsonb_build_object('property_id',p_property_id)
    );
  end if;
  return jsonb_build_object('ok',true,'id',p_property_id,'estado','inactiva','activa',false);
end;
$$;

create or replace function public.admin_rechazar_solicitud(p_solicitud_id uuid, p_motivo text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare sol public.solicitudes_propiedades%rowtype; motivo_final text;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode='42501'; end if;
  select * into sol from public.solicitudes_propiedades where id=p_solicitud_id for update;
  if not found then raise exception 'No se encontró la solicitud'; end if;
  if lower(coalesce(sol.estado,'')) <> 'pendiente' then raise exception 'La solicitud ya fue procesada'; end if;
  motivo_final := nullif(trim(coalesce(p_motivo,'')),'');
  update public.solicitudes_propiedades set estado='rechazada',motivo_rechazo=motivo_final,updated_at=now() where id=p_solicitud_id;
  if sol.user_id is not null then
    perform public.crear_notificacion_evento(
      sol.user_id,
      'Solicitud rechazada',
      coalesce(motivo_final,'Tu solicitud necesita correcciones antes de poder publicarse.'),
      'solicitud',
      'property-rejected:' || sol.id::text,
      jsonb_build_object('request_id',sol.id)
    );
  end if;
  return true;
end;
$$;

create or replace function public.admin_reject_property_request(p_request_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare r public.solicitudes_propiedades%rowtype; admin_id uuid:=auth.uid(); reason text:=nullif(trim(p_reason),'');
begin
  if admin_id is null or not public.is_admin() then raise exception 'Solo administradores pueden rechazar solicitudes' using errcode='42501'; end if;
  if reason is null then raise exception 'El motivo de rechazo es obligatorio'; end if;
  select * into r from public.solicitudes_propiedades where id=p_request_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if coalesce(r.estado,'pendiente') <> 'pendiente' then raise exception 'La solicitud ya fue procesada'; end if;
  update public.solicitudes_propiedades set estado='rechazada',motivo_rechazo=reason,updated_at=now() where id=r.id;
  if r.user_id is not null then
    perform public.crear_notificacion_evento(r.user_id,'Solicitud rechazada',reason,'solicitud','property-rejected:'||r.id::text,jsonb_build_object('request_id',r.id));
  end if;
  insert into public.admin_activity_log(actor_id,action,table_name,record_id,old_data,new_data,metadata)
  values(admin_id,'reject','solicitudes_propiedades',r.id,to_jsonb(r),jsonb_build_object('estado','rechazada','motivo_rechazo',reason),'{}'::jsonb);
  return true;
end;
$$;
