import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export default function AdminAuditoria() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(100);
    if (!error) setRows(data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useRealtimeTable('admin_activity_log', load);
  return <ScreenContainer edges={['top','left','right']} containerClassName="bg-background">
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Auditoría administrativa</Text>
      <Text style={styles.sub}>Últimas acciones realizadas por administradores.</Text>
      {loading ? <ActivityIndicator color="#C9A84C" /> : rows.map(r => <View key={r.id} style={styles.card}>
        <View style={styles.row}><Text style={styles.action}>{String(r.action).toUpperCase()}</Text><Text style={styles.date}>{new Date(r.created_at).toLocaleString('es-MX')}</Text></View>
        <Text style={styles.entity}>{r.table_name} · {r.record_id || '—'}</Text>
        {r.metadata && Object.keys(r.metadata).length > 0 && <Text style={styles.meta}>{JSON.stringify(r.metadata)}</Text>}
      </View>)}
      {!loading && rows.length === 0 && <Text style={styles.empty}>Todavía no hay acciones registradas.</Text>}
    </ScrollView>
  </ScreenContainer>;
}
const styles=StyleSheet.create({container:{padding:16,paddingBottom:100},title:{fontSize:23,fontWeight:'800',color:'#fff',marginBottom:5},sub:{color:'#999',marginBottom:18},card:{backgroundColor:'#171717',borderWidth:1,borderColor:'#2d2d2d',borderRadius:12,padding:14,marginBottom:10},row:{flexDirection:'row',justifyContent:'space-between'},action:{color:'#C9A84C',fontWeight:'800'},date:{color:'#777',fontSize:11},entity:{color:'#ddd',marginTop:8,fontSize:12},meta:{color:'#888',fontSize:11,marginTop:5},empty:{color:'#888',textAlign:'center',marginTop:30}});
