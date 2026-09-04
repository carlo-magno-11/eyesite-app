import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { ScreenContainer } from '../../components/screen-container';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Link } from 'expo-router';

export default function AdminPropiedades() {
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('propiedades')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) console.log('Error:', error.message);
      else setProps(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <ScreenContainer edges={['top','left','right']} containerClassName="bg-background">
        <View style={{flex:1, justifyContent:'center', alignItems:'center', marginTop:100}}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={{color:'#fff', marginTop:10}}>Cargando propiedades...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Propiedades Publicadas</Text>
          <Text style={styles.subtitle}>Gestiona las propiedades activas en la plataforma - {props.length} total</Text>
          
          {props.length === 0 ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderTitle}>Sin propiedades</Text>
              <Text style={styles.placeholderDesc}>Aún no hay propiedades. Publícalas desde tu panel HTML.</Text>
            </View>
          ) : (
            props.map((p) => (
              <Link key={p.id} href={`/admin/solicitud/${p.id}` as any} asChild>
                <TouchableOpacity style={styles.card}>
                  {p.fotos?.[0] && <Image source={{uri: p.fotos[0]}} style={styles.thumb} />}
                  <View style={{flex:1}}>
                    <Text style={styles.cardTitle}>{p.titulo}</Text>
                    <Text style={styles.cardSub}>{p.municipio} - ${Number(p.precio_actual).toLocaleString('es-MX')} / {p.unidad_precio || 'm²'}</Text>
                    <Text style={{color: p.activa ? '#4CAF7A' : '#E05555', fontSize:11, marginTop:4}}>{p.activa ? '● Activa' : '● Inactiva'} - {p.tipo}</Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { color: '#888', fontSize:13, marginBottom:16 },
  placeholder: { backgroundColor:'#1E1E1E', padding:24, borderRadius:12, alignItems:'center', marginTop:20 },
  placeholderTitle: { color:'#fff', fontWeight:'700', fontSize:16 },
  placeholderDesc: { color:'#777', fontSize:12, marginTop:6, textAlign:'center' },
  card: { backgroundColor:'#1E1E1E', padding:12, borderRadius:12, marginBottom:10, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#2a2a2a' },
  thumb: { width:60, height:45, borderRadius:6, backgroundColor:'#333', marginRight:12 },
  cardTitle: { color:'#fff', fontWeight:'600', fontSize:14 },
  cardSub: { color:'#aaa', fontSize:12, marginTop:2 },
});