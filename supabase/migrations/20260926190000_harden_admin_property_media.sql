-- EYESITE — Server-side validation for public property media on admin create/update
-- Branch-only hardening. Public catalog media must originate from eyesite-media.

create or replace function private.assert_public_property_media_payload(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = private, public, pg_temp
as $function$
declare
  v_value jsonb;
  v_item text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload inválido';
  end if;

  foreach v_value in array array[
    p_payload->'portada_url',
    p_payload->'video_url'
  ]::jsonb[]
  loop
    if v_value is not null and jsonb_typeof(v_value) <> 'null' then
      if jsonb_typeof(v_value) <> 'string'
         or (v_value #>> '{}') !~* '^https://xhvpvpvtkdgnnxdwdrkn\.supabase\.co/storage/v1/object/public/eyesite-media/.+$'
      then
        raise exception 'La referencia de media pública no pertenece al bucket eyesite-media';
      end if;
    end if;
  end loop;

  foreach v_value in array array[
    p_payload->'fotos',
    p_payload->'fotos_pro',
    p_payload->'imagenes',
    p_payload->'videos'
  ]::jsonb[]
  loop
    if v_value is null or jsonb_typeof(v_value) = 'null' then
      continue;
    end if;

    if jsonb_typeof(v_value) <> 'array' then
      raise exception 'La colección de media pública debe ser un arreglo';
    end if;

    for v_item in select value from jsonb_array_elements_text(v_value)
    loop
      if v_item !~* '^https://xhvpvpvtkdgnnxdwdrkn\.supabase\.co/storage/v1/object/public/eyesite-media/.+$' then
        raise exception 'Una referencia de media pública no pertenece al bucket eyesite-media';
      end if;
    end loop;
  end loop;
end;
$function$;

revoke all on function private.assert_public_property_media_payload(jsonb) from public, anon, authenticated;

create or replace function public.admin_create_property(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_row public.propiedades%rowtype;
  v_payload jsonb;
  v_user_id uuid;
  v_user_role text;
  v_user_estado text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload inválido';
  end if;

  perform private.assert_public_property_media_payload(p_payload);

  if nullif(trim(p_payload->>'user_id'), '') is not null then
    begin v_user_id := (p_payload->>'user_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'El usuario asociado no es válido';
    end;
    select role, estado into v_user_role, v_user_estado from public.profiles where id = v_user_id;
    if not found then raise exception 'El usuario asociado no existe'; end if;
    if coalesce(v_user_role, 'user') = 'admin' then
      raise exception 'No se pueden asignar propiedades de catálogo a una cuenta administradora';
    end if;
    if coalesce(v_user_estado, '') <> 'activa' then
      raise exception 'El usuario asociado debe tener un perfil activo';
    end if;
  end if;

  v_payload := p_payload
    - 'id' - 'created_at' - 'updated_at' - 'usuario_id'
    - 'solicitud_origen' - 'vistas' - 'favoritos' - 'estado'
    - 'status' - 'activa' - 'estatus';

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
  v_row.estado := 'activa';
  v_row.status := 'activa';
  v_row.activa := true;
  v_row.estatus := 'aprobada';
  v_row.vistas := 0;
  v_row.favoritos := 0;
  v_row.created_at := coalesce(v_row.created_at, now());
  v_row.updated_at := now();

  insert into public.propiedades select v_row.* returning * into v_row;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'user_id', v_row.user_id, 'property', to_jsonb(v_row));
end;
$function$;

revoke all on function public.admin_create_property(jsonb) from public, anon;
grant execute on function public.admin_create_property(jsonb) to authenticated;

create or replace function public.admin_update_property(p_property_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_key text;
  v_old public.propiedades%rowtype;
  v_allowed constant text[] := array[
    'titulo','tipo','municipio','direccion','superficie','unidad_superficie',
    'frente','fondo','precio_actual','precio_mercado','unidad_precio','rendimiento',
    'moneda','estado','estatus_legal','certeza_legal','destacada','descripcion',
    'descripcion_pro','caracteristicas','servicios_cercanos','fotos','fotos_pro',
    'pdfs','kmz_kml','videos','ubicaciones','tour_360','paquete','precio_sesion',
    'sesion_pagada','sesion_fecha','comision_porcentaje','dueno_nombre',
    'dueno_telefono','dueno_email','vistas','favoritos','contacto_nombre',
    'contacto_telefono','contacto_whatsapp','precio_esperado','estatus','detalles',
    'tipo_portada','portada_url','portada_tipo','video_url','activa','orden','precio',
    'ubicacion','imagenes','codigo','construccion_m2','contacto_email','archivos',
    'enlaces','status','latitud','longitud'
  ];
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo administradores pueden editar propiedades' using errcode='42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Datos de propiedad inválidos';
  end if;

  select * into v_old from public.propiedades where id = p_property_id for update;
  if not found then raise exception 'Propiedad no encontrada'; end if;

  if p_payload ? 'portada_url' or p_payload ? 'video_url'
     or p_payload ? 'fotos' or p_payload ? 'fotos_pro'
     or p_payload ? 'imagenes' or p_payload ? 'videos' then
    perform private.assert_public_property_media_payload(p_payload);
  end if;

  for v_key in select jsonb_object_keys(p_payload)
  loop
    if v_key = any(v_allowed) then
      execute format(
        'update public.propiedades set %1$I = (jsonb_populate_record((select p from public.propiedades p where p.id = $2), $3::jsonb)).%1$I where id = $2',
        v_key
      ) using null, p_property_id, jsonb_build_object(v_key, p_payload -> v_key);
    end if;
  end loop;

  update public.propiedades set updated_at = now() where id = p_property_id;
  return jsonb_build_object('ok', true, 'id', p_property_id);
end;
$function$;

revoke all on function public.admin_update_property(uuid,jsonb) from public, anon;
grant execute on function public.admin_update_property(uuid,jsonb) to authenticated;
