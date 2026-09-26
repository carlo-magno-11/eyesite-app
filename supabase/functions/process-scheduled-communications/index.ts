import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-eyesite-cron-secret"};
const RETRIES=[5,15,60];
const EXPO_BATCH_SIZE=100;
const EXPO_CONCURRENCY=3;
const DB_CONCURRENCY=10;
const retryAt=(attempt)=>new Date(Date.now()+RETRIES[Math.min(Math.max(attempt-1,0),RETRIES.length-1)]*60000).toISOString();
async function expoSend(messages){
 const r=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(messages)});
 const p=await r.json(); return {ok:r.ok,tickets:Array.isArray(p?.data)?p.data:[]};
}
function chunks(items,size){const out=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out;}
async function mapWithConcurrency(items,concurrency,worker){
 const results=new Array(items.length); let cursor=0;
 const workers=Array.from({length:Math.min(concurrency,items.length)},async()=>{
  while(true){const index=cursor++;if(index>=items.length)return;results[index]=await worker(items[index]);}
 });
 await Promise.all(workers); return results;
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 let schedulerClaimed=false;
 try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supplied=req.headers.get("x-eyesite-cron-secret")||"";
  const {data:expected,error:secretError}=await admin.rpc("get_eyesite_scheduler_secret");
  if(secretError||!expected||supplied!==expected)return new Response(JSON.stringify({error:"No autorizado"}),{status:401,headers:H});
  const {data:claimed,error:claimError}=await admin.rpc("claim_eyesite_scheduler",{p_lease_seconds:90});
  if(claimError)throw claimError;
  if(claimed!==true)return new Response(JSON.stringify({ok:true,skipped:true,reason:"scheduler_locked"}),{status:200,headers:H});
  const now=new Date().toISOString(), result={notifications:0,notification_push_sent:0,notification_push_retried:0,announcements:0,announcement_push_sent:0,skipped:false,errors:[]};
  schedulerClaimed=true;
  const {data:dueN,error:nError}=await admin.from("notificaciones").select("id").eq("estado_envio","pendiente").lte("programada_para",now).order("programada_para").limit(100);
  if(nError)throw nError;
  if(dueN?.length){
   const {error}=await admin.from("notificaciones").update({estado_envio:"sent",sent_at:now}).in("id",dueN.map(n=>n.id)).eq("estado_envio","pendiente");
   if(error)throw error;
   result.notifications+=dueN.length;
  }
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
  const {data:ads,error:adsError}=await admin.from("anuncios").select("id,titulo,mensaje,tipo,entregas_generadas_at").eq("estado_publicacion","publicado").eq("activa",true).is("entregas_generadas_at",null).limit(50);
  if(adsError)throw adsError;
  if(ads?.length){
   const {data:profiles,error:pe}=await admin.from("profiles").select("id").eq("estado","activa").neq("role","admin").eq("anuncios_push",true);
   if(pe)throw pe;
   for(const a of ads){
    if(profiles?.length){
     const rows=profiles.map(p=>({anuncio_id:a.id,user_id:p.id}));
     for(const batch of chunks(rows,500)){
      const {error}=await admin.from("anuncio_entregas").upsert(batch,{onConflict:"anuncio_id,user_id",ignoreDuplicates:true});
      if(error)throw error;
     }
    }
    const {error}=await admin.from("anuncios").update({entregas_generadas_at:now,updated_at:now}).eq("id",a.id).is("entregas_generadas_at",null);
    if(error)throw error;
   }
  }
  const {data:ds,error:de}=await admin.from("anuncio_entregas").select("id,anuncio_id,user_id,push_attempts").in("push_status",["pending","error"]).or("push_next_retry_at.is.null,push_next_retry_at.lte."+now).order("created_at").limit(500);
  if(de)throw de;
  if(ds?.length){
   const announcementIds=[...new Set(ds.map(d=>d.anuncio_id))];
   const userIds=[...new Set(ds.map(d=>d.user_id))];
   const [{data:announcements,error:ae},{data:profiles,error:pe}]=await Promise.all([
    admin.from("anuncios").select("id,titulo,mensaje,tipo,activa,estado_publicacion").in("id",announcementIds),
    admin.from("profiles").select("id,expo_push_token,anuncios_push").in("id",userIds).eq("estado","activa"),
   ]);
   if(ae)throw ae;if(pe)throw pe;
   const byA=new Map((announcements||[]).map(a=>[a.id,a]));
   const byP=new Map((profiles||[]).map(p=>[p.id,p]));
   const ready=[],notConfigured=[];
   for(const d of ds){
    const a=byA.get(d.anuncio_id),p=byP.get(d.user_id);
    if(!a||!a.activa||a.estado_publicacion!=="publicado")continue;
    if(p?.anuncios_push===false||!String(p?.expo_push_token||"").startsWith("ExponentPushToken[")){notConfigured.push(d.id);continue;}
    ready.push({row:d,attempts:Number(d.push_attempts||0)+1,message:{to:p.expo_push_token,sound:"default",title:a.titulo,body:a.mensaje,data:{tipo:a.tipo||"anuncio",announcement_id:a.id}}});
   }
   if(notConfigured.length){
    const {error}=await admin.from("anuncio_entregas").update({push_status:"not_configured",push_next_retry_at:null,updated_at:now}).in("id",notConfigured);if(error)throw error;
   }
   for(const batch of chunks(ready,EXPO_BATCH_SIZE)){
    try{
     const sent=await expoSend(batch.map(x=>x.message));
     await mapWithConcurrency(batch,DB_CONCURRENCY,async(item)=>{
      const index=batch.indexOf(item),t=sent.tickets[index],attempts=item.attempts;
      if(t?.status==="ok"){
       const {error}=await admin.from("anuncio_entregas").update({push_status:"sent",push_attempts:attempts,sent_at:now,push_next_retry_at:null,push_error:null,updated_at:now}).eq("id",item.row.id);if(error)throw error;result.announcement_push_sent++;return;
      }
      if(t?.details?.error==="DeviceNotRegistered"){
       const {error}=await admin.from("profiles").update({expo_push_token:null}).eq("id",item.row.user_id);if(error)throw error;
       const r=await admin.from("anuncio_entregas").update({push_status:"not_configured",push_attempts:attempts,push_next_retry_at:null,push_error:"DeviceNotRegistered",updated_at:now}).eq("id",item.row.id);if(r.error)throw r.error;return;
      }
      const err=String(t?.details?.error||t?.message||(!sent.ok?"Expo request failed":"Push rechazado"));
      const r=await admin.from("anuncio_entregas").update({push_status:"error",push_attempts:attempts,push_next_retry_at:attempts<RETRIES.length?retryAt(attempts):null,push_error:err,updated_at:now}).eq("id",item.row.id);if(r.error)throw r.error;
      result.errors.push("announcement:"+item.row.anuncio_id+":user:"+item.row.user_id+":"+err);
     });
    }catch(e){
     const err=e instanceof Error?e.message:String(e);
     await mapWithConcurrency(batch,DB_CONCURRENCY,item=>admin.from("anuncio_entregas").update({push_status:"error",push_attempts:item.attempts,push_next_retry_at:item.attempts<RETRIES.length?retryAt(item.attempts):null,push_error:err,updated_at:now}).eq("id",item.row.id));
     for(const item of batch)result.errors.push("announcement:"+item.row.anuncio_id+":user:"+item.row.user_id+":"+err);
    }
   }
  }
  await admin.from("anuncios").update({activa:false,updated_at:now}).eq("activa",true).not("fecha_expiracion","is",null).lte("fecha_expiracion",now);
  return new Response(JSON.stringify({ok:true,...result}),{headers:H});
 }catch(e){console.error("[process-scheduled-communications]",e);return new Response(JSON.stringify({error:e instanceof Error?e.message:String(e)}),{status:500,headers:H});}
 finally{if(schedulerClaimed){try{await admin.rpc("release_eyesite_scheduler");}catch(releaseError){console.error("[process-scheduled-communications] release lock failed",releaseError);}}}
});