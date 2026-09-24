import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useResponsive } from "@/hooks/use-responsive";

export default function SettingsScreen(){
 const {user}=useAuth();
 const { horizontalPadding, contentMaxWidth } = useResponsive();
 const signOut=async()=>{await supabase.auth.signOut();router.replace("/(auth)/login" as never)};
 return <View style={[s.page,{paddingHorizontal:horizontalPadding,maxWidth:contentMaxWidth,width:"100%",alignSelf:"center"}]}><Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Volver</Text></Pressable><Text style={s.title}>CONFIGURACIÓN</Text><View style={s.card}><Text style={s.heading}>Cuenta</Text><Text style={s.email}>{user?.email||"—"}</Text><Text style={s.info}>El correo se administra desde Supabase Auth y no se modifica desde esta pantalla.</Text></View><Pressable style={s.row} onPress={()=>router.push("/privacy" as never)}><Text style={s.rowText}>Aviso de privacidad</Text><Text style={s.arrow}>›</Text></Pressable><Pressable style={s.row} onPress={()=>router.push("/terms" as never)}><Text style={s.rowText}>Términos y condiciones</Text><Text style={s.arrow}>›</Text></Pressable><Pressable style={s.logout} onPress={signOut}><Text style={s.logoutText}>CERRAR SESIÓN</Text></Pressable></View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#0E0E0E",padding:20,paddingTop:55},back:{color:"#C9A84C",fontWeight:"800",marginBottom:18},title:{color:"#FFF",fontSize:28,fontWeight:"900",marginBottom:20},card:{backgroundColor:"#171717",borderWidth:1,borderColor:"#2A2A2A",borderRadius:12,padding:16,marginBottom:12},heading:{color:"#C9A84C",fontWeight:"900"},email:{color:"#FFF",marginTop:8},info:{color:"#888",fontSize:11,lineHeight:17,marginTop:8},row:{backgroundColor:"#171717",borderWidth:1,borderColor:"#2A2A2A",borderRadius:10,padding:16,marginBottom:9,flexDirection:"row",justifyContent:"space-between"},rowText:{color:"#FFF",fontWeight:"700"},arrow:{color:"#C9A84C",fontSize:24},logout:{borderWidth:1,borderColor:"#C9A84C",borderRadius:8,padding:15,alignItems:"center",marginTop:12},logoutText:{color:"#C9A84C",fontWeight:"900"}
});