-- EYESITE: secure editor for pending property requests
-- Production-aligned definition verified on 2026-09-25.
-- Allows an administrator to correct/enrich a pending request without publishing it.

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
  v_old public.solicitudes_propiedades%rowtype;
  v_new public.solicitudes_propiedades%rowtype;
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

  if lower(coalesce(v_old.estado, 'pendiente')) <> 'pendiente' then
    raise exception 'La solicitud ya fue procesada';
  end if;

  update public.solicitudes_propiedades
  set
    titulo = case when p_payload ? 'titulo' then p_payload->>'titulo' else titulo end,
    tipo = case when p_payload ? 'tipo' then p_payload->>'tipo' else tipo end,
    municipio = case when p_payload ? 'municipio' then p_payload->>'municipio' else municipio end,
    direccion = case when p_payload ? 'direccion' then p_payload->>'direccion' else direccion end,
    superficie = case when p_payload ? 'superficie' then nullif(p_payload->>'superficie','')::numeric else superficie end,
    unidad_superficie = case when p_payload ? 'unidad_superficie' then p_payload->>'unidad_superficie' else unidad_superficie end,
    frente = case when p_payload ? 'frente' then nullif(p_payload->>'frente','')::numeric else frente end,
    fondo = case when p_payload ? 'fondo' then nullif(p_payload->>'fondo','')::numeric else fondo end,
    precio_actual = case when p_payload ? 'precio_actual' then nullif(p_payload->>'precio_actual','')::numeric else precio_actual end,
    precio_mercado = case when p_payload ? 'precio_mercado' then nullif(p_payload->>'precio_mercado','')::numeric else precio_mercado end,
    precio_esperado = case when p_payload ? 'precio_esperado' then nullif(p_payload->>'precio_esperado','')::numeric else precio_esperado end,
    unidad_precio = case when p_payload ? 'unidad_precio' then p_payload->>'unidad_precio' else unidad_precio end,
    rendimiento = case when p_payload ? 'rendimiento' then nullif(p_payload->>'rendimiento','')::integer else rendimiento end,
    moneda = case when p_payload ? 'moneda' then p_payload->>'moneda' else moneda end,
    estatus_legal = case when p_payload ? 'estatus_legal' then p_payload->>'estatus_legal' else estatus_legal end,
    certeza_legal = case when p_payload ? 'certeza_legal' then (p_payload->>'certeza_legal')::boolean else certeza_legal end,
    destacada = case when p_payload ? 'destacada' then (p_payload->>'destacada')::boolean else destacada end,
    descripcion = case when p_payload ? 'descripcion' then p_payload->>'descripcion' else descripcion end,
    descripcion_pro = case when p_payload ? 'descripcion_pro' then p_payload->>'descripcion_pro' else descripcion_pro end,
    caracteristicas = case when p_payload ? 'caracteristicas' then p_payload->'caracteristicas' else caracteristicas end,
    servicios_cercanos = case when p_payload ? 'servicios_cercanos' then p_payload->'servicios_cercanos' else servicios_cercanos end,
    fotos = case when p_payload ? 'fotos' then array(select jsonb_array_elements_text(p_payload->'fotos')) else fotos end,
    fotos_pro = case when p_payload ? 'fotos_pro' then array(select jsonb_array_elements_text(p_payload->'fotos_pro')) else fotos_pro end,
    pdfs = case when p_payload ? 'pdfs' then array(select jsonb_array_elements_text(p_payload->'pdfs')) else pdfs end,
    kmz_kml = case when p_payload ? 'kmz_kml' then array(select jsonb_array_elements_text(p_payload->'kmz_kml')) else kmz_kml end,
    videos = case when p_payload ? 'videos' then array(select jsonb_array_elements_text(p_payload->'videos')) else videos end,
    ubicaciones = case when p_payload ? 'ubicaciones' then array(select jsonb_array_elements_text(p_payload->'ubicaciones')) else ubicaciones end,
    precio = case when p_payload ? 'precio' then nullif(p_payload->>'precio','')::numeric else precio end,
    ubicacion = case when p_payload ? 'ubicacion' then p_payload->>'ubicacion' else ubicacion end,
    contacto_nombre = case when p_payload ? 'contacto_nombre' then p_payload->>'contacto_nombre' else contacto_nombre end,
    contacto_telefono = case when p_payload ? 'contacto_telefono' then p_payload->>'contacto_telefono' else contacto_telefono end,
    contacto_email = case when p_payload ? 'contacto_email' then p_payload->>'contacto_email' else contacto_email end,
    dueno_nombre = case when p_payload ? 'dueno_nombre' then p_payload->>'dueno_nombre' else dueno_nombre end,
    dueno_telefono = case when p_payload ? 'dueno_telefono' then p_payload->>'dueno_telefono' else dueno_telefono end,
    dueno_email = case when p_payload ? 'dueno_email' then p_payload->>'dueno_email' else dueno_email end,
    contacto_whatsapp = case when p_payload ? 'contacto_whatsapp' then p_payload->>'contacto_whatsapp' else contacto_whatsapp end,
    tour_360 = case when p_payload ? 'tour_360' then p_payload->>'tour_360' else tour_360 end,
    paquete = case when p_payload ? 'paquete' then p_payload->>'paquete' else paquete end,
    precio_sesion = case when p_payload ? 'precio_sesion' then nullif(p_payload->>'precio_sesion','')::integer else precio_sesion end,
    sesion_pagada = case when p_payload ? 'sesion_pagada' then (p_payload->>'sesion_pagada')::boolean else sesion_pagada end,
    sesion_fecha = case when p_payload ? 'sesion_fecha' then nullif(p_payload->>'sesion_fecha','')::date else sesion_fecha end,
    comision_porcentaje = case when p_payload ? 'comision_porcentaje' then nullif(p_payload->>'comision_porcentaje','')::numeric else comision_porcentaje end,
    detalles = case when p_payload ? 'detalles' then p_payload->'detalles' else detalles end,
    latitud = case when p_payload ? 'latitud' then nullif(p_payload->>'latitud','')::double precision else latitud end,
    longitud = case when p_payload ? 'longitud' then nullif(p_payload->>'longitud','')::double precision else longitud end,
    construccion_m2 = case when p_payload ? 'construccion_m2' then nullif(p_payload->>'construccion_m2','')::numeric else construccion_m2 end,
    video_url = case when p_payload ? 'video_url' then p_payload->>'video_url' else video_url end,
    tipo_portada = case when p_payload ? 'tipo_portada' then p_payload->>'tipo_portada' else tipo_portada end,
    portada_url = case when p_payload ? 'portada_url' then p_payload->>'portada_url' else portada_url end,
    imagenes = case when p_payload ? 'imagenes' then p_payload->'imagenes' else imagenes end,
    archivos = case when p_payload ? 'archivos' then p_payload->'archivos' else archivos end,
    enlaces = case when p_payload ? 'enlaces' then p_payload->'enlaces' else enlaces end,
    updated_at = now()
  where id = p_request_id;

  select * into v_new from public.solicitudes_propiedades where id = p_request_id;

  insert into public.admin_activity_log(
    actor_id, action, table_name, record_id, old_data, new_data, metadata
  )
  values(
    auth.uid(),
    'update_pending_property',
    'solicitudes_propiedades',
    p_request_id,
    to_jsonb(v_old),
    to_jsonb(v_new),
    jsonb_build_object('status','pending_edit')
  );

  return jsonb_build_object('ok', true, 'id', p_request_id, 'estado', v_new.estado);
end;
$$;

revoke all on function public.admin_update_property_request(uuid,jsonb) from public;
revoke all on function public.admin_update_property_request(uuid,jsonb) from anon;
grant execute on function public.admin_update_property_request(uuid,jsonb) to authenticated;
