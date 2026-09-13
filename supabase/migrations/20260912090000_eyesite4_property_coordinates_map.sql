-- EYESITE 4 — geographic coordinates for the property map.
-- Coordinates are optional so legacy properties remain publishable while the
-- admin/user location picker is progressively populated.

ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS latitud double precision,
  ADD COLUMN IF NOT EXISTS longitud double precision;

ALTER TABLE public.solicitudes_propiedades
  ADD COLUMN IF NOT EXISTS latitud double precision,
  ADD COLUMN IF NOT EXISTS longitud double precision;

ALTER TABLE public.propiedades
  DROP CONSTRAINT IF EXISTS propiedades_latitud_chk,
  DROP CONSTRAINT IF EXISTS propiedades_longitud_chk,
  ADD CONSTRAINT propiedades_latitud_chk CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
  ADD CONSTRAINT propiedades_longitud_chk CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180);

ALTER TABLE public.solicitudes_propiedades
  DROP CONSTRAINT IF EXISTS solicitudes_propiedades_latitud_chk,
  DROP CONSTRAINT IF EXISTS solicitudes_propiedades_longitud_chk,
  ADD CONSTRAINT solicitudes_propiedades_latitud_chk CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
  ADD CONSTRAINT solicitudes_propiedades_longitud_chk CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180);

CREATE INDEX IF NOT EXISTS propiedades_geo_idx
  ON public.propiedades (latitud, longitud)
  WHERE estado='activa' AND coalesce(activa,true)=true AND latitud IS NOT NULL AND longitud IS NOT NULL;

-- Replace the public projection while preserving its deliberately narrow boundary.
DROP VIEW IF EXISTS public.propiedades_publicas;
CREATE VIEW public.propiedades_publicas AS
SELECT
  id,codigo,titulo,tipo,municipio,ubicacion,direccion,superficie,unidad_superficie,frente,fondo,
  precio_actual,precio_mercado,precio,precio_esperado,unidad_precio,rendimiento,moneda,
  estatus_legal,certeza_legal,destacada,descripcion,descripcion_pro,caracteristicas,servicios_cercanos,
  fotos,videos,ubicaciones,tour_360,tipo_portada,portada_url,portada_tipo,video_url,construccion_m2,
  latitud,longitud,
  activa,estado,orden,created_at,updated_at
FROM public.propiedades
WHERE estado='activa' AND coalesce(activa,true)=true;

REVOKE ALL ON public.propiedades_publicas FROM public,anon,authenticated;
GRANT SELECT ON public.propiedades_publicas TO anon,authenticated;

-- Recreate the approval function so coordinates travel atomically from the
-- moderated request to the public property record.
DROP FUNCTION IF EXISTS public.admin_approve_property_request(uuid,text,text,text,text[],text[]);

CREATE OR REPLACE FUNCTION public.admin_approve_property_request(
  p_request_id uuid,
  p_video_url text DEFAULT NULL,
  p_portada_url text DEFAULT NULL,
  p_tipo_portada text DEFAULT NULL,
  p_fotos text[] DEFAULT NULL,
  p_fotos_pro text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  r public.solicitudes_propiedades%rowtype;
  new_id uuid;
  admin_id uuid := auth.uid();
  final_video text;
  final_cover text;
  final_cover_type text;
BEGIN
  IF admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden aprobar solicitudes' USING errcode='42501';
  END IF;

  SELECT * INTO r FROM public.solicitudes_propiedades WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  IF coalesce(r.estado,'pendiente') <> 'pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue procesada'; END IF;

  final_video := coalesce(p_video_url,r.video_url);
  final_cover := coalesce(p_portada_url,r.portada_url);
  final_cover_type := coalesce(p_tipo_portada,r.tipo_portada,case when final_video is not null then 'video' else 'foto' end);

  INSERT INTO public.propiedades (
    titulo,tipo,municipio,direccion,superficie,unidad_superficie,frente,fondo,precio_actual,precio_mercado,precio_esperado,unidad_precio,moneda,rendimiento,
    estado,estatus_legal,certeza_legal,destacada,descripcion,descripcion_pro,caracteristicas,servicios_cercanos,fotos,fotos_pro,pdfs,kmz_kml,videos,ubicaciones,
    tour_360,paquete,precio_sesion,sesion_pagada,sesion_fecha,comision_porcentaje,dueno_nombre,dueno_telefono,dueno_email,contacto_nombre,contacto_telefono,
    contacto_whatsapp,contacto_email,construccion_m2,detalles,imagenes,archivos,enlaces,solicitud_origen,user_id,tipo_portada,portada_url,portada_tipo,video_url,
    latitud,longitud,activa,orden,status,created_at,updated_at
  ) VALUES (
    r.titulo,coalesce(r.tipo,'terreno'),coalesce(r.municipio,r.ubicacion),r.direccion,coalesce(r.superficie,0),coalesce(r.unidad_superficie,'m2'),coalesce(r.frente,0),coalesce(r.fondo,0),
    coalesce(r.precio_actual,r.precio,0),r.precio_mercado,r.precio_esperado,coalesce(r.unidad_precio,'m2'),coalesce(r.moneda,'MXN'),coalesce(r.rendimiento,0),'activa',
    coalesce(r.estatus_legal,'Sin revisar'),coalesce(r.certeza_legal,false),coalesce(r.destacada,false),r.descripcion,r.descripcion_pro,coalesce(r.caracteristicas,'{}'::jsonb),
    coalesce(r.servicios_cercanos,'{}'::jsonb),coalesce(p_fotos,r.fotos,'{}'::text[]),coalesce(p_fotos_pro,r.fotos_pro,'{}'::text[]),coalesce(r.pdfs,'{}'::text[]),coalesce(r.kmz_kml,'{}'::text[]),
    case when final_video is not null then array[final_video] else coalesce(r.videos,'{}'::text[]) end,coalesce(r.ubicaciones,'{}'::text[]),r.tour_360,coalesce(r.paquete,'basico'),coalesce(r.precio_sesion,0),
    coalesce(r.sesion_pagada,false),r.sesion_fecha,coalesce(r.comision_porcentaje,5),r.dueno_nombre,r.dueno_telefono,r.dueno_email,r.contacto_nombre,r.contacto_telefono,r.contacto_whatsapp,r.contacto_email,
    r.construccion_m2,coalesce(r.detalles,'{}'::jsonb),to_jsonb(coalesce(p_fotos,r.fotos,'{}'::text[])),coalesce(r.archivos,'[]'::jsonb),coalesce(r.enlaces,'[]'::jsonb),r.id,r.user_id,
    final_cover_type,final_cover,final_cover_type,final_video,r.latitud,r.longitud,true,0,'activa',now(),now()
  ) RETURNING id INTO new_id;

  UPDATE public.solicitudes_propiedades
  SET estado='aprobada',updated_at=now(),video_url=final_video,portada_url=final_cover,tipo_portada=final_cover_type
  WHERE id=r.id;

  IF r.user_id IS NOT NULL THEN
    INSERT INTO public.notificaciones(user_id,titulo,mensaje,tipo,leida)
    VALUES(r.user_id,'Propiedad aprobada','Tu propiedad "'||coalesce(r.titulo,'Sin título')||'" fue aprobada y publicada.','propiedad',false);
  END IF;

  INSERT INTO public.admin_activity_log(actor_id,action,table_name,record_id,old_data,new_data,metadata)
  VALUES(admin_id,'approve','solicitudes_propiedades',r.id,to_jsonb(r),jsonb_build_object('estado','aprobada','property_id',new_id),jsonb_build_object('property_id',new_id));
  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_property_request(uuid,text,text,text,text[],text[]) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_property_request(uuid,text,text,text,text[],text[]) TO authenticated,service_role;

NOTIFY pgrst,'reload schema';
