-- EYESITE 4 — seguridad de lectura pública + moderación atómica.
-- Ya aplicada en producción como eyesite4_hardening_v2.

drop view if exists public.propiedades_admin;
create view public.propiedades_admin as select * from public.propiedades where public.is_admin();
revoke all on public.propiedades from public, anon, authenticated;
revoke all on public.propiedades_publicas from public, anon, authenticated;
revoke all on public.propiedades_admin from public, anon, authenticated;
grant select on public.propiedades_publicas to anon, authenticated;
grant select on public.propiedades_admin to authenticated;

drop trigger if exists eyesite_price_drop on public.propiedades;
create or replace function public.eyesite_price_drop_notification() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.precio_actual is not null and new.precio_actual is not null and new.precio_actual < old.precio_actual and coalesce(new.estado,'')='activa' and coalesce(new.activa,true)=true then
  insert into public.notificaciones(user_id,titulo,mensaje,tipo,leida)
  select distinct x.user_id,'Bajó el precio de una propiedad que sigues',format('"%s" bajó de $%s a $%s.',coalesce(new.titulo,'Propiedad'),old.precio_actual,new.precio_actual),'precio',false
  from (select f.user_id from public.favoritos f where f.property_id=new.id union select new.user_id where new.user_id is not null) x
  where x.user_id is not null;
 end if; return new;
end; $$;
create trigger eyesite_price_drop after update of precio_actual on public.propiedades for each row execute function public.eyesite_price_drop_notification();

create or replace function public.admin_approve_property_request(p_request_id uuid,p_video_url text default null,p_portada_url text default null,p_tipo_portada text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.solicitudes_propiedades%rowtype; new_id uuid; admin_id uuid:=auth.uid(); final_video text; final_cover text; final_cover_type text;
begin
 if admin_id is null or not public.is_admin() then raise exception 'Solo administradores pueden aprobar solicitudes' using errcode='42501'; end if;
 select * into r from public.solicitudes_propiedades where id=p_request_id for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 if coalesce(r.estado,'pendiente') <> 'pendiente' then raise exception 'La solicitud ya fue procesada'; end if;
 final_video:=coalesce(p_video_url,r.video_url); final_cover:=coalesce(p_portada_url,r.portada_url); final_cover_type:=coalesce(p_tipo_portada,r.tipo_portada,case when final_video is not null then 'video' else 'foto' end);
 insert into public.propiedades (titulo,tipo,municipio,direccion,superficie,unidad_superficie,frente,fondo,precio_actual,precio_mercado,precio_esperado,unidad_precio,moneda,rendimiento,estado,estatus_legal,certeza_legal,destacada,descripcion,descripcion_pro,caracteristicas,servicios_cercanos,fotos,fotos_pro,pdfs,kmz_kml,videos,ubicaciones,tour_360,paquete,precio_sesion,sesion_pagada,sesion_fecha,comision_porcentaje,dueno_nombre,dueno_telefono,dueno_email,contacto_nombre,contacto_telefono,contacto_whatsapp,contacto_email,construccion_m2,detalles,imagenes,archivos,enlaces,solicitud_origen,user_id,tipo_portada,portada_url,portada_tipo,video_url,activa,orden,status,created_at,updated_at)
 values (r.titulo,coalesce(r.tipo,'terreno'),coalesce(r.municipio,r.ubicacion),r.direccion,coalesce(r.superficie,0),coalesce(r.unidad_superficie,'m2'),coalesce(r.frente,0),coalesce(r.fondo,0),coalesce(r.precio_actual,r.precio,0),r.precio_mercado,r.precio_esperado,coalesce(r.unidad_precio,'m2'),coalesce(r.moneda,'MXN'),coalesce(r.rendimiento,0),'activa',coalesce(r.estatus_legal,'Sin revisar'),coalesce(r.certeza_legal,false),coalesce(r.destacada,false),r.descripcion,r.descripcion_pro,coalesce(r.caracteristicas,'{}'::jsonb),coalesce(r.servicios_cercanos,'{}'::jsonb),coalesce(r.fotos,'{}'::text[]),coalesce(r.fotos_pro,'{}'::text[]),coalesce(r.pdfs,'{}'::text[]),coalesce(r.kmz_kml,'{}'::text[]),coalesce(r.videos,'{}'::text[]),coalesce(r.ubicaciones,'{}'::text[]),r.tour_360,coalesce(r.paquete,'basico'),coalesce(r.precio_sesion,0),coalesce(r.sesion_pagada,false),r.sesion_fecha,coalesce(r.comision_porcentaje,5),r.dueno_nombre,r.dueno_telefono,r.dueno_email,r.contacto_nombre,r.contacto_telefono,r.contacto_whatsapp,r.contacto_email,r.construccion_m2,coalesce(r.detalles,'{}'::jsonb),coalesce(r.imagenes,to_jsonb(coalesce(r.fotos,'{}'::text[]))),coalesce(r.archivos,'[]'::jsonb),coalesce(r.enlaces,'[]'::jsonb),r.id,r.user_id,final_cover_type,final_cover,final_cover_type,final_video,true,0,'activa',now(),now()) returning id into new_id;
 update public.solicitudes_propiedades set estado='aprobada',updated_at=now(),video_url=final_video,portada_url=final_cover,tipo_portada=final_cover_type where id=r.id;
 if r.user_id is not null then insert into public.notificaciones(user_id,titulo,mensaje,tipo,leida) values(r.user_id,'Propiedad aprobada','Tu propiedad "'||coalesce(r.titulo,'Sin título')||'" fue aprobada y publicada.','propiedad',false); end if;
 insert into public.admin_activity_log(actor_id,action,table_name,record_id,old_data,new_data,metadata) values(admin_id,'approve','solicitudes_propiedades',r.id,to_jsonb(r),jsonb_build_object('estado','aprobada','property_id',new_id),jsonb_build_object('property_id',new_id));
 return new_id;
end; $$;
revoke all on function public.admin_approve_property_request(uuid,text,text,text) from public;
grant execute on function public.admin_approve_property_request(uuid,text,text,text) to authenticated;

create or replace function public.admin_reject_property_request(p_request_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare r public.solicitudes_propiedades%rowtype; admin_id uuid:=auth.uid(); reason text:=nullif(trim(p_reason),'');
begin
 if admin_id is null or not public.is_admin() then raise exception 'Solo administradores pueden rechazar solicitudes' using errcode='42501'; end if;
 if reason is null then raise exception 'El motivo de rechazo es obligatorio'; end if;
 select * into r from public.solicitudes_propiedades where id=p_request_id for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 if coalesce(r.estado,'pendiente') <> 'pendiente' then raise exception 'La solicitud ya fue procesada'; end if;
 update public.solicitudes_propiedades set estado='rechazada',motivo_rechazo=reason,updated_at=now() where id=r.id;
 if r.user_id is not null then insert into public.notificaciones(user_id,titulo,mensaje,tipo,leida) values(r.user_id,'Solicitud rechazada',reason,'solicitud',false); end if;
 insert into public.admin_activity_log(actor_id,action,table_name,record_id,old_data,new_data,metadata) values(admin_id,'reject','solicitudes_propiedades',r.id,to_jsonb(r),jsonb_build_object('estado','rechazada','motivo_rechazo',reason),'{}'::jsonb);
 return true;
end; $$;
revoke all on function public.admin_reject_property_request(uuid,text) from public;
grant execute on function public.admin_reject_property_request(uuid,text) to authenticated;
notify pgrst,'reload schema';
