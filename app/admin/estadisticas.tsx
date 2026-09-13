import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export default function AdminEstadisticas() {
  const [stats, setStats] = useState({ activos: 0, inactivos: 0, pendientes: 0, usuarios: 0, favoritos: 0, notificaciones: 0 });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const [active, inactive, pending, users, favs, notes] = await Promise.all([
      supabase.from('propiedades_admin').select('id', { count:'exact', head:true }).eq('estado','activa'),
      supabase.from('propiedades_admin').select('id', { count:'exact', head:true }).eq('activa',false),
      supabase.from('solicitudes_propiedades').select('id', { count:'exact', head:true }).eq('estado','pendiente'),
      supabase.from('profiles').select('id', { count:'exact', head:true }),
      supabase.from('favoritos').select('id', { count:'exact', head:true }),
      supabase.from('notificaciones').select('id', { count:'exact', head:true }),
    ]);
    setStats({ activos:active.count||0,inactivos:inactive.count||0,pendientes:pending.count||0,usuarios:users.count||0,favoritos:favs.count||0,notificaciones:notes.count||0 });
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useRealtimeTable('propiedades',load); useRealtimeTable('profiles',load); useRealtimeTable('favoritos',load); useRealtimeTable('solicitudes_propiedades',load);
  return <ScreenContainer edges={['top','left','right']} containerClassName="bg-background"><ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Estadísticas</Text><Text style={styles.sub}>Resumen operativo de EYESITE.</Text>
    {loading ? <ActivityIndicator color="#C9A84C"/> : <View style={styles.grid}>{Object.entries({activos:stats.activos,inactivos:stats.inactivos,pendientes:stats.pendientes,usuarios:stats.usuarios,favoritos:stats.favoritos,notificaciones:stats.notificaciones}).map(([k,v])=><View key={k} style={styles.card}><Text style={styles.value}>{v}</Text><Text style={styles.label}>{k}</Text></View>)}</View>}
  </ScrollView></ScreenContainer>;
}
const styles=StyleSheet.create({container:{padding:16,paddingBottom:100},title:{color:'#fff',fontSize:23,fontWeight:'800'},sub:{color:'#999',marginBottom:20,marginTop:4},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},card:{width:'47%',backgroundColor:'#171717',borderWidth:1,borderColor:'#2b2b2b',borderRadius:12,padding:18},value:{color:'#C9A84C',fontSize:27,fontWeight:'800'},label:{color:'#999',marginTop:5,textTransform:'capitalize'}});
