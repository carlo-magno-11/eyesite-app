import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers});
 if(req.method!=="POST") return json({error:"Método no permitido"},405);
 const authorization=req.headers.get("Authorization"); if(!authorization)return json({error:"No autorizado"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return json({error:"Configuración incompleta"},500);
 try{
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error:userError}=await caller.auth.getUser();
  if(userError||!user)return json({error:"Sesión inválida"},401);
  const admin=createClient(url,service);
  const {data:profile,error:profileError}=await admin.from("profiles").select("estado,role").eq("id",user.id).maybeSingle();
  if(profileError)return json({error:"No se pudo validar el perfil"},500);
  const isActiveAdmin=profile?.role==="admin"&&profile?.estado==="activa";
  const isActiveUser=profile?.role!=="admin"&&profile?.estado==="activa";
  if(!isActiveAdmin&&!isActiveUser)return json({error:"Acceso no autorizado"},403);
  const body=await req.json(), propertyId=typeof body?.property_id==="string"?body.property_id.trim():"", path=typeof body?.path==="string"?body.path.trim().replace(/^\/+/, ""):"";
  if(!propertyId||!path)return json({error:"property_id y path son obligatorios"},400);
  if(path.includes("..")||path.includes("\\")||path.includes("?")||path.includes("#")||path.startsWith("http"))return json({error:"Ruta no válida"},400);
  const {data:property,error:propertyError}=await admin.from("propiedades_publicas").select("id,pdfs,kmz_kml,archivos").eq("id",propertyId).eq("estado","activa").maybeSingle();
  if(propertyError)return json({error:"No se pudo validar la propiedad"},500);
  if(!property)return json({error:"Propiedad no encontrada"},404);
  const values:string[]=[];
  for(const item of [...(Array.isArray(property.pdfs)?property.pdfs:[]),...(Array.isArray(property.kmz_kml)?property.kmz_kml:[]),...(Array.isArray(property.archivos)?property.archivos:[])]){if(typeof item==="string")values.push(item);else if(item&&typeof item==="object"){if(typeof item.path==="string")values.push(item.path);if(typeof item.url==="string")values.push(item.url);if(typeof item.publicUrl==="string")values.push(item.publicUrl);}}
  const normalize=(v:string)=>v.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/[^/]+\//,"").replace(/^eyesite-private\//,"");
  if(!values.map(normalize).includes(path))return json({error:"Archivo no asociado a esta propiedad"},403);
  const {data,error}=await admin.storage.from("eyesite-private").createSignedUrl(path,3600);
  if(error||!data?.signedUrl)return json({error:error?.message||"No se pudo generar el enlace"},500);
  return json({signedUrl:data.signedUrl,expiresIn:3600});
 }catch(error){console.error("[get-property-document]",error);return json({error:"Error interno"},500);}
});