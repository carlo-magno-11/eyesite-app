-- EYESITE: publicación administrativa a nombre de usuario + catálogo de usuarios
-- Fecha: 2026-09-22

create or replace function public.admin_create_property(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row public.propiedades%rowtype;
  v_payload jsonb;
  v_user_id uuid;
  v_user_role text;
  v_user_estado text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'No autorizado' using errcode='42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Payload inválido'; end if;
  if nullif(trim(p_payload->>'user_id'), '') is not null then
    begin v_user_id := (p_payload->>'user_id')::uuid;
    exception when invalid_text_representation then raise exception 'El usuario asociado no es válido'; end;
    select role, estado into v_user_role, v_user_estado from public.profiles where id = v_user_id;
    if not found then raise exception 'El usuario asociado no existe'; end if;
    if coalesce(v_user_role, 'user') = 'admin' then raise exception 'No se pueden asignar propiedades de catálogo a una cuenta administradora'; end if;
    if coalesce(v_user_estado, '') <> 'activa' then raise exception 'El usuario asociado debe tener un perfil activo'; end if;
  end if;
  v_payload := p_payload - 'id' - 'created_at' - 'updated_at' - 'usuario_id' - 'solicitud_origen' - 'vistas' - 'favoritos' - 'estado' - 'status' - 'activa' - 'estatus';
  v_row := jsonb_populate_record(null::public.propiedades, v_payload);
  if nullif(trim(v_row.titulo), '') is null then raise exception 'El título es obligatorio'; end if;
  if nullif(trim(v_row.tipo), '') is null then raise exception 'El tipo es obligatorio'; end if;
  if nullif(trim(v_row.municipio), '') is null then raise exception 'El municipio es obligatorio'; end if;
  v_row.id := coalesce(v_row.id, gen_random_uuid());
  v_row.user_id := v_user_id;
  v_row.solicitud_origen := null;
  v_row.superficie := coalesce(v_row.superficie, 0);
  v_row.precio_actual := coalesce(v_row.precio_actual, 0);
  v_row.archivos := coalesce(v_row.archivos, '[]'::jsonb);
  v_row.enlaces := coalesce(v_row.enlaces, '[]'::jsonb);
  v_row.estado := 'activa'; v_row.status := 'activa'; v_row.activa := true; v_row.estatus := 'aprobada';
  v_row.vistas := 0; v_row.favoritos := 0;
  v_row.created_at := coalesce(v_row.created_at, now()); v_row.updated_at := now();
  insert into public.propiedades select v_row.* returning * into v_row;
  return jsonb_build_object('ok', true, 'id', v_row.id, 'user_id', v_row.user_id, 'property', to_jsonb(v_row));
end;
$function$;

create or replace function public.admin_assign_property_user(p_property_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare v_role text; v_estado text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Solo administradores pueden asociar propiedades a usuarios' using errcode='42501'; end if;
  if p_property_id is null then raise exception 'Propiedad inválida'; end if;
  if p_user_id is not null then
    select role, estado into v_role, v_estado from public.profiles where id = p_user_id;
    if not found then raise exception 'El usuario asociado no existe'; end if;
    if coalesce(v_role, 'user') = 'admin' then raise exception 'No se pueden asociar propiedades a una cuenta administradora'; end if;
    if coalesce(v_estado, '') <> 'activa' then raise exception 'El usuario asociado debe tener un perfil activo'; end if;
  end if;
  update public.propiedades set user_id = p_user_id, updated_at = now() where id = p_property_id;
  if not found then raise exception 'Propiedad no encontrada'; end if;
  return jsonb_build_object('ok', true, 'property_id', p_property_id, 'user_id', p_user_id);
end;
$function$;

revoke all on function public.admin_assign_property_user(uuid, uuid) from public;
revoke all on function public.admin_assign_property_user(uuid, uuid) from anon;
grant execute on function public.admin_assign_property_user(uuid, uuid) to authenticated;
