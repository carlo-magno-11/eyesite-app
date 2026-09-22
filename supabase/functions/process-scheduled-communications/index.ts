import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-eyesite-cron-secret"};
const RETRIES=[5,15,60];
const retryAt=(attempt)=>new Date(Date.now()+RETRIES[Math.min(Math.max(attempt-1,0),RETRIES.length-1)]*60000).toISOString();
async function expoSend(messages){
 const r=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(messages)});
 const p=await r.json(); return {ok:r.ok,tickets:Array.isArray(p?.data)?p.data:[]};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supplied=req.headers.get("x-eyesite-cron-secret")||"";
  const {data:expected,error:secretError}=await admin.rpc("get_eyesite_scheduler_secret");
  if(secretError||!expected||supplied!==expected)return new Response(JSON.stringify({error:"No autorizado"}),{status:401,headers:H});
  const now=new Date().toISOString(), result={notifications:0,notification_push_sent:0,notification_push_retried:0,announcements:0,announcement_push_sent:0,errors:[]};
  const {data:dueN,error:nError}=await admin.from("notificaciones").select("id").eq("estado_envio","pendiente").lte("programada_para",now).order("programada_para").limit(100);
  if(nError)throw nError;
  for(const n of dueN||[]){await admin.from("notificaciones").update({estado_envio:"sent",sent_at:now}).eq("id",n.id).eq("estado_envio","pendiente");result.notifications++;}
  const {data:pushN,error:pnError}=await admin.from("notificaciones").select("id,user_id,titulo,mensaje,tipo,data,push_attempts").eq("estado_envio","sent").is("push_sent_at",null).in("push_status",["pending","error"]).or("push_next_retry_at.is.null,push_next_retry_at.lte."+now).order("created_at").limit(100);
  if(pnError)throw pnError;
  for(const n of pushN||[]){
   const {data:p}=await admin.from("profiles").select("expo_push_token,notificaciones_push").eq("id",n.user_id).eq("estado","activa").maybeSingle();
   if(p?.notificaciones_push===false||!String(p?.expo_push_token||"").startsWith("ExponentPushToken[")){await admin.from("notificaciones").update({push_status:"not_configured",push_next_retry_at:null}).eq("id",n.id);continue;}
   const attempts=Number(n.push_attempts||0)+1;
   try{
    const sent=await expoSend([{to:p.expo_push_token,sound:"default",title:n.titulo,body:n.mensaje,data:{tipo:n.tipo||"informacion",notification_id:n.id,...(n.data&&typeof n.data==="object"?n.data:{})}}]);
    const t=sent.tickets[0];
    if(t?.status==="ok"){await admin.from("notificaciones").update({push_status:"sent",push_attempts:attempts,push_sent_at:now,push_next_retry_at:null,push_error:null}).eq("id",n.id);result.notification_push_sent++;if(attempts>1)result.notification_push_retried++;}
    else if(t?.details?.error==="DeviceNotRegistered"){await admin.from("profiles").update({expo_push_token:null}).eq("id",n.user_id);await admin.from("notificaciones").update({push_status:"not_configured",push_attempts:attempts,push_next_retry_at:null,push_error:"DeviceNotRegistered"}).eq("id",n.id);}
    else{const err=String(t?.details?.error||t?.message||"Push rechazado");await admin.from("notificaciones").update({push_status:"error",push_attempts:attempts,push_next_retry_at:attempts<RETRIES.length?retryAt(attempts):null,push_error:err}).eq("id",n.id);result.errors.push("notification:"+n.id+":"+err);}
   }catch(e){const err=e instanceof Error?e.message:String(e);await admin.from("notificaciones").update({push_status:"error",push_attempts:attempts,push_next_retry_at:attempts<RETRIES.length?retryAt(attempts):null,push_error:err}).eq("id",n.id);result.errors.push("notification:"+n.id+":"+err);}
  }
  const {data:dueA,error:aError}=await admin.from("anuncios").select("id,fecha_expiracion").eq("estado_publicacion","pendiente").lte("programada_para",now).limit(50);
  if(aError)throw aError;
  for(const a of dueA||[]){if(a.fecha_expiracion&&new Date(a.fecha_expiracion).getTime()<=Date.now()){await admin.from("anuncios").update({estado_publicacion:"cancelado",activa:false,updated_at:now}).eq("id",a.id);continue;}await admin.from("anuncios").update({estado_publicacion:"publicado",activa:true,published_at:now,publicada_en:now,updated_at:now}).eq("id",a.id).eq("estado_publicacion","pendiente");result.announcements++;}
  const {data:ads,error:adsError}=await admin.from("anuncios").select("id,titulo,mensaje,tipo").eq("estado_publicacion","publicado").eq("activa",true).limit(50);
  if(adsError)throw adsError;
  for(const a of ads||[]){
   const {data:profiles,error:pe}=await admin.from("profiles").select("id").eq("estado","activa").neq("role","admin").eq("anuncios_push",true);
   if(pe)throw pe;
   if(profiles?.length)await admin.from("anuncio_entregas").upsert(profiles.map(p=>({anuncio_id:a.id,user_id:p.id})),{onConflict:"anuncio_id,user_id",ignoreDuplicates:true});
  }
  const {data:ds,error:de}=await admin.from("anuncio_entregas").select("id,anuncio_id,user_id,push_attempts").in("push_status",["pending","error"]).or("push_next_retry_at.is.null,push_next_retry_at.lte."+now).order("created_at").limit(100);
  if(de)throw de;
  for(const d of ds||[]){
   const {data:a}=await admin.from("anuncios").select("id,titulo,mensaje,tipo,activa,estado_publicacion").eq("id",d.anuncio_id).maybeSingle();
   if(!a||!a.activa||a.estado_publicacion!=="publicado")continue;
   const {data:p}=await admin.from("profiles").select("expo_push_token,anuncios_push").eq("id",d.user_id).eq("estado","activa").maybeSingle();
   if(p?.anuncios_push===false||!String(p?.expo_push_token||"").startsWith("ExponentPushToken[")){await admin.from("anuncio_entregas").update({push_status:"not_configured",push_next_retry_at:null,updated_at:now}).eq("id",d.id);continue;}
   const attempts=Number(d.push_attempts||0)+1;
   try{
    const sent=await expoSend([{to:p.expo_push_token,sound:"default",title:a.titulo,body:a.mensaje,data:{tipo:a.tipo||"anuncio",announcement_id:a.id}}]),t=sent.tickets[0];
    if(t?.status==="ok"){await admin.from("anuncio_entregas").update({push_status:"sent",push_attempts:attempts,sent_at:now,push_next_retry_at:null,push_error:null,updated_at:now}).eq("id",d.id);result.announcement_push_sent++;}
    else if(t?.details?.error==="DeviceNotRegistered"){await admin.from("profiles").update({expo_push_token:null}).eq("id",d.user_id);await admin.from("anuncio_entregas").update({push_status:"not_configured",push_attempts:attempts,push_next_retry_at:null,push_error:"DeviceNotRegistered",updated_at:now}).eq("id",d.id);}
    else{const err=String(t?.details?.error||t?.message||"Push rechazado");await admin.from("anuncio_entregas").update({push_status:"error",push_attempts:attempts,push_next_retry_at:attempts<RETRIES.length?retryAt(attempts):null,push_error:err,updated_at:now}).eq("id",d.id);result.errors.push("announcement:"+d.anuncio_id+":user:"+d.user_id+":"+err);}
   }catch(e){const err=e instanceof Error?e.message:String(e);await admin.from("anuncio_entregas").update({push_status:"error",push_attempts:attempts,push_next_retry_at:attempts<RETRIES.length?retryAt(attempts):null,push_error:err,updated_at:now}).eq("id",d.id);result.errors.push("announcement:"+d.anuncio_id+":user:"+d.user_id+":"+err);}
  }
  await admin.from("anuncios").update({activa:false,updated_at:now}).eq("activa",true).not("fecha_expiracion","is",null).lte("fecha_expiracion",now);
  return new Response(JSON.stringify({ok:true,...result}),{headers:H});
 }catch(e){console.error("[process-scheduled-communications]",e);return new Response(JSON.stringify({error:e instanceof Error?e.message:String(e)}),{status:500,headers:H});}
});