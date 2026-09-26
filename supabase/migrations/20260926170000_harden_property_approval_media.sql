-- EYESITE — Harden published media references during property approval
-- Client-side validation is useful for UX, but publication integrity must also
-- be enforced inside the privileged approval RPC.
--
-- This migration is intentionally branch-only until CI and runtime validation
-- are complete.

create or replace function public.admin_approve_property_request(
  p_request_id uuid,
  p_video_url text default null,
  p_portada_url text default null,
  p_tipo_portada text default null,
  p_fotos text[] default null,
  p_fotos_pro text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  r public.solicitudes_propiedades%rowtype;
  new_id uuid;
  admin_id uuid := auth.uid();
  final_video text;
  final_cover text;
  final_cover_type text;
  media_item text;
begin
  if admin_id is null or not public.is_admin() then
    raise exception 'Solo administradores pueden aprobar solicitudes'
      using errcode='42501';
  end if;

  select *
    into r
  from public.solicitudes_propiedades
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if coalesce(r.estado, 'pendiente') <> 'pendiente' then
    raise exception 'La solicitud ya fue procesada';
  end if;

  /*
   * Publication boundary:
   * only absolute URLs generated from the public EYESITE media bucket may
   * enter the public catalog. Staging/private/legacy UUID paths are rejected.
   */
  if p_video_url is not null then
    if p_video_url !~* '^https://xhvpvpvtkdgnnxdwdrkn\.supabase\.co/storage/v1/object/public/eyesite-media/.+$'
       or p_video_url ~* '/(eyesite-staging|eyesite-private)/' then
      raise exception 'El video de publicación no pertenece al bucket público de EYESITE';
    end if;
  end if;

  if p_portada_url is not null then
    if p_portada_url !~* '^https://xhvpvpvtkdgnnxdwdrkn\.supabase\.co/storage/v1/object/public/eyesite-media/.+$'
       or p_portada_url ~* '/(eyesite-staging|eyesite-private)/' then
      raise exception 'La portada de publicación no pertenece al bucket público de EYESITE';
    end if;
  end if;

  if p_fotos is not null then
    foreach media_item in array p_fotos
    loop
      if media_item is null or media_item !~* '^https://xhvpvpvtkdgnnxdwdrkn\.supabase\.co/storage/v1/object/public/eyesite-media/.+$' then
        raise exception 'Una de las fotos no pertenece al bucket público de EYESITE';
      end if;
    end loop;
  end if;

  if p_fotos_pro is not null then
    foreach media_item in array p_fotos_pro
    loop
      if media_item is null or media_item !~* '^https://xhvpvpvtkdgnnxdwdrkn\.supabase\.co/storage/v1/object/public/eyesite-media/.+$' then
        raise exception 'Una de las fotos profesionales no pertenece al bucket público de EYESITE';
      end if;
    end loop;
  end if;

  /*
   * Never fall back to an unvalidated request-side staging/private reference.
   * A missing promoted medium remains NULL and the property can still publish.
   */
  final_video := p_video_url;
  final_cover := p_portada_url;

  final_cover_type :=
    coalesce(
      p_tipo_portada,
      case
        when final_video is not null and final_cover is null then 'video'
        when final_cover is not null then 'foto'
        else null
      end
    );

  insert into public.propiedades(
    titulo,tipo,municipio,direccion,superficie,unidad_superficie,frente,fondo,
    precio_actual,precio_mercado,precio_esperado,unidad_precio,moneda,rendimiento,
    estado,estatus_legal,certeza_legal,destacada,descripcion,descripcion_pro,
    caracteristicas,servicios_cercanos,fotos,fotos_pro,pdfs,kmz_kml,videos,
    ubicaciones,tour_360,paquete,precio_sesion,sesion_pagada,sesion_fecha,
    comision_porcentaje,dueno_nombre,dueno_telefono,dueno_email,contacto_nombre,
    contacto_telefono,contacto_whatsapp,contacto_email,construccion_m2,detalles,
    imagenes,archivos,enlaces,solicitud_origen,user_id,tipo_portada,portada_url,
    portada_tipo,video_url,latitud,longitud,activa,orden,status,created_at,updated_at
  )
  values(
    r.titulo,
    coalesce(r.tipo,'terreno'),
    coalesce(r.municipio,r.ubicacion),
    r.direccion,
    coalesce(r.superficie,0),
    coalesce(r.unidad_superficie,'m2'),
    coalesce(r.frente,0),
    coalesce(r.fondo,0),
    coalesce(r.precio_actual,r.precio,0),
    r.precio_mercado,
    r.precio_esperado,
    coalesce(r.unidad_precio,'m2'),
    coalesce(r.moneda,'MXN'),
    coalesce(r.rendimiento,0),
    'activa',
    coalesce(r.estatus_legal,'Sin revisar'),
    coalesce(r.certeza_legal,false),
    coalesce(r.destacada,false),
    r.descripcion,
    r.descripcion_pro,
    coalesce(r.caracteristicas,'{}'::jsonb),
    coalesce(r.servicios_cercanos,'{}'::jsonb),
    coalesce(p_fotos,'{}'::text[]),
    coalesce(p_fotos_pro,'{}'::text[]),
    coalesce(r.pdfs,'{}'::text[]),
    coalesce(r.kmz_kml,'{}'::text[]),
    case when final_video is not null then array[final_video] else '{}'::text[] end,
    coalesce(r.ubicaciones,'{}'::text[]),
    r.tour_360,
    coalesce(r.paquete,'basico'),
    coalesce(r.precio_sesion,0),
    coalesce(r.sesion_pagada,false),
    r.sesion_fecha,
    coalesce(r.comision_porcentaje,5),
    r.dueno_nombre,
    r.dueno_telefono,
    r.dueno_email,
    r.contacto_nombre,
    r.contacto_telefono,
    r.contacto_whatsapp,
    r.contacto_email,
    r.construccion_m2,
    coalesce(r.detalles,'{}'::jsonb),
    to_jsonb(coalesce(p_fotos,'{}'::text[])),
    coalesce(r.archivos,'[]'::jsonb),
    coalesce(r.enlaces,'[]'::jsonb),
    r.id,
    r.user_id,
    final_cover_type,
    final_cover,
    final_cover_type,
    final_video,
    r.latitud,
    r.longitud,
    true,
    0,
    'activa',
    now(),
    now()
  )
  returning id into new_id;

  update public.solicitudes_propiedades
  set estado='aprobada',
      updated_at=now(),
      video_url=final_video,
      portada_url=final_cover,
      tipo_portada=final_cover_type
  where id=r.id;

  if r.user_id is not null then
    perform public.crear_notificacion_evento(
      r.user_id,
      'Propiedad aprobada',
      'Tu propiedad "' || coalesce(r.titulo,'Sin título') || '" fue aprobada y publicada.',
      'propiedad',
      'property_approved:' || r.id::text,
      jsonb_build_object('property_id',new_id,'request_id',r.id)
    );
  end if;

  insert into public.admin_activity_log(
    actor_id,action,table_name,record_id,old_data,new_data,metadata
  )
  values(
    admin_id,
    'approve',
    'solicitudes_propiedades',
    r.id,
    to_jsonb(r),
    jsonb_build_object('estado','aprobada','property_id',new_id),
    jsonb_build_object('property_id',new_id)
  );

  return new_id;
end;
$function$;

revoke all on function public.admin_approve_property_request(
  uuid,text,text,text,text[],text[]
) from public, anon;

grant execute on function public.admin_approve_property_request(
  uuid,text,text,text,text[],text[]
) to authenticated;
