-- EYESITE: secure editor for pending property requests
-- Allows the admin to enrich/correct a request without publishing it.
create or replace function public.admin_update_property_request(
  p_request_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_old public.solicitudes_propiedades%rowtype;
  v_allowed constant text[] := array[
    'titulo','tipo','municipio','direccion','superficie','unidad_superficie',
    'frente','fondo','precio_actual','precio_mercado','precio_esperado',
    'unidad_precio','moneda','rendimiento','estatus_legal','certeza_legal',
    'descripcion','descripcion_pro','caracteristicas','servicios_cercanos',
    'fotos','fotos_pro','pdfs','kmz_kml','videos','ubicaciones','tour_360',
    'paquete','precio_sesion','sesion_pagada','sesion_fecha',
    'comision_porcentaje','dueno_nombre','dueno_telefono','dueno_email',
    'contacto_nombre','contacto_telefono','contacto_whatsapp','contacto_email',
    'construccion_m2','detalles','imagenes','archivos','enlaces',
    'video_url','portada_url','tipo_portada','portada_tipo','latitud','longitud',
    'precio','ubicacion'
  ];
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo administradores pueden editar solicitudes' using errcode='42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Datos de solicitud inválidos';
  end if;

  select * into v_old
  from public.solicitudes_propiedades
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if lower(coalesce(v_old.estado,'pendiente')) <> 'pendiente' then
    raise exception 'La solicitud ya fue procesada';
  end if;

  for v_key in select jsonb_object_keys(p_payload)
  loop
    if v_key = any(v_allowed) then
      execute format(
        'update public.solicitudes_propiedades
         set %1$I = (jsonb_populate_record((select r from public.solicitudes_propiedades r where r.id = $2), $3::jsonb)).%1$I
         where id = $2',
        v_key
      ) using null, p_request_id, jsonb_build_object(v_key, p_payload -> v_key);
    end if;
  end loop;

  -- Explicitly preserve moderation state. This RPC can never approve.
  update public.solicitudes_propiedades
  set estado = 'pendiente',
      updated_at = now()
  where id = p_request_id;

  insert into public.admin_activity_log(
    actor_id, action, table_name, record_id, old_data, new_data, metadata
  )
  values(
    auth.uid(),
    'update',
    'solicitudes_propiedades',
    p_request_id,
    to_jsonb(v_old),
    (select to_jsonb(r) from public.solicitudes_propiedades r where r.id = p_request_id),
    jsonb_build_object('source','admin_update_property_request','state_preserved','pendiente')
  );

  return jsonb_build_object(
    'ok', true,
    'id', p_request_id,
    'estado', 'pendiente'
  );
end;
$$;

revoke all on function public.admin_update_property_request(uuid,jsonb) from public;
revoke all on function public.admin_update_property_request(uuid,jsonb) from anon;
grant execute on function public.admin_update_property_request(uuid,jsonb) to authenticated;
