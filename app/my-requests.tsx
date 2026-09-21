import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function MyRequestsScreen() {
  const { user } = useAuth();
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ if(!user)return; let alive=true; (async()=>{const {data,error}=await supabase.from("solicitudes_propiedades").select("id,titulo,tipo,municipio,precio_actual,estado,motivo_rechazo,created_at,updated_at,propiedad_id").eq("user_id",user.id).order("created_at",{ascending:false}); if(alive){setItems(data||[]);setLoading(false);} if(error)console.error("[my-requests]",error);})(); return()=>{alive=false};},[user]);
  return <View style={s.page}><Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Volver</Text></Pressable><Text style={s.title}>MIS SOLICITUDES</Text>{loading?<ActivityIndicator color="#C9A84C"/>:items.length===0?<Text style={s.empty}>No tienes solicitudes todavía.</Text>:<ScrollView>{items.map(p=><View key={p.id} style={s.card}><Text style={s.name}>{p.titulo||"Sin título"}</Text><Text style={s.meta}>{p.tipo||"Terreno"} · {p.municipio||"—"}</Text><Text style={s.status}>Estado: {p.estado||"—"}</Text>{p.motivo_rechazo?<Text style={s.reason}>Motivo: {p.motivo_rechazo}</Text>:null}{p.propiedad_id&&p.estado==="aprobada"?<Pressable onPress={()=>router.push(("/property/"+p.propiedad_id) as never)}><Text style={s.link}>VER PUBLICACIÓN ›</Text></Pressable>:null}</View>)}</ScrollView>}</View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#0E0E0E",padding:20,paddingTop:55},back:{color:"#C9A84C",fontWeight:"800",marginBottom:18},title:{color:"#FFF",fontSize:26,fontWeight:"900",marginBottom:18},card:{backgroundColor:"#171717",borderWidth:1,borderColor:"#2A2A2A",borderRadius:12,padding:16,marginBottom:10},name:{color:"#FFF",fontSize:16,fontWeight:"800"},meta:{color:"#999",marginTop:5},status:{color:"#C9A84C",fontWeight:"800",marginTop:10},reason:{color:"#E57373",fontSize:12,marginTop:8},link:{color:"#C9A84C",fontWeight:"900",marginTop:12},empty:{color:"#888",marginTop:20}});