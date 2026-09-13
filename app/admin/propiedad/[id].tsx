import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import { ScreenContainer } from '@/components/screen-container';
import { supabase } from '@/lib/supabase';

const YUCATAN_REGION: Region = { latitude: 20.9674, longitude: -89.5926, latitudeDelta: 0.35, longitudeDelta: 0.35 };

export default function AdminPropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [price, setPrice] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [mapRegion, setMapRegion] = useState<Region>(YUCATAN_REGION);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from('propiedades_admin').select('*').eq('id', id).maybeSingle();
    if (error || !data) { Alert.alert('Error', error?.message || 'Propiedad no encontrada'); router.back(); return; }
    setP(data); setPrice(String(data.precio_actual ?? ''));
    setLatitud(data.latitud != null ? String(data.latitud) : '');
    setLongitud(data.longitud != null ? String(data.longitud) : '');
    if (data.latitud != null && data.longitud != null) {
      setMapRegion({ latitude: Number(data.latitud), longitude: Number(data.longitud), latitudeDelta: 0.02, longitudeDelta: 0.02 });
    }
    setLoading(false);
  }, [id]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async (changes: Record<string, any>, message = 'Cambios guardados.') => {
    setSaving(true);
    const { error } = await supabase.from('propiedades').update(changes).eq('id', id);
    setSaving(false);
    if (error) Alert.alert('Error', error.message); else { Alert.alert('Guardado', message); load(); }
  };

  const setMapPoint = (latitude: number, longitude: number) => {
    setLatitud(latitude.toFixed(7));
    setLongitud(longitude.toFixed(7));
    setMapRegion({ latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 });
  };

  const saveLocation = () => {
    const lat = latitud.trim() === '' ? null : Number(latitud.replace(',', '.'));
    const lng = longitud.trim() === '' ? null : Number(longitud.replace(',', '.'));
    if ((lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) || (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
      return Alert.alert('Coordenadas inválidas', 'Latitud debe estar entre -90 y 90 y longitud entre -180 y 180.');
    }
    if ((lat === null) !== (lng === null)) return Alert.alert('Coordenadas incompletas', 'Captura latitud y longitud juntas.');
    save({ latitud: lat, longitud: lng }, lat === null ? 'Ubicación eliminada.' : 'Ubicación verificada guardada.');
  };

  if (loading) return <ScreenContainer edges={['top','left','right']} containerClassName="bg-background"><View style={styles.center}><ActivityIndicator color="#C9A84C" size="large" /></View></ScreenContainer>;
  if (!p) return null;
  const hasCoords = Number.isFinite(Number(p.latitud)) && Number.isFinite(Number(p.longitud));

  return <ScreenContainer edges={['top','left','right']} containerClassName="bg-background">
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{p.titulo || 'Propiedad'}</Text>
      <Text style={styles.code}>{p.codigo || p.id}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Estado</Text>
        <Text style={styles.value}>{p.estado} · {p.activa ? 'Activa' : 'Inactiva'}</Text>
        <View style={styles.actions}>
          <Pressable disabled={saving} onPress={() => save({ estado:'activa', status:'activa', activa:true })} style={styles.green}><Text style={styles.btn}>Activar</Text></Pressable>
          <Pressable disabled={saving} onPress={() => save({ estado:'inactiva', status:'inactiva', activa:false })} style={styles.red}><Text style={styles.btn}>Desactivar</Text></Pressable>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Precio actual</Text>
        <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />
        <Pressable disabled={saving} onPress={() => { const n=Number(price.replace(',', '.')); if (!Number.isFinite(n) || n<0) return Alert.alert('Precio inválido'); save({ precio_actual:n }); }} style={styles.gold}><Text style={styles.btn}>Guardar precio</Text></Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Ubicación verificada para el mapa</Text>
        <Text style={styles.helper}>Toca directamente sobre el punto real del terreno para colocar el marcador. Esto es mejor que usar el centro del municipio.</Text>
        {Platform.OS !== 'web' ? (
          <View style={styles.mapBox}>
            <MapView style={StyleSheet.absoluteFill} region={mapRegion} onPress={(e) => setMapPoint(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)} showsCompass>
              {hasCoords && <Marker coordinate={{ latitude: Number(p.latitud), longitude: Number(p.longitud) }} title={p.titulo || 'Propiedad'} />}
              {(latitud && longitud && Number.isFinite(Number(latitud)) && Number.isFinite(Number(longitud))) && <Marker coordinate={{ latitude: Number(latitud), longitude: Number(longitud) }} title="Nuevo punto" pinColor="#C9A84C" />}
            </MapView>
            <View style={styles.mapHint}><Text style={styles.mapHintText}>Toca el mapa para colocar/mover el pin</Text></View>
          </View>
        ) : <Text style={styles.helper}>El selector de mapa está disponible en la app móvil. Puedes capturar las coordenadas abajo en web.</Text>}
        <TextInput value={latitud} onChangeText={setLatitud} keyboardType="decimal-pad" placeholder="Latitud" placeholderTextColor="#666" style={styles.input} />
        <TextInput value={longitud} onChangeText={setLongitud} keyboardType="decimal-pad" placeholder="Longitud" placeholderTextColor="#666" style={styles.input} />
        <Pressable disabled={saving} onPress={saveLocation} style={styles.gold}><Text style={styles.btn}>Guardar ubicación del mapa</Text></Pressable>
        {hasCoords && <Text style={styles.saved}>✓ Ubicación actual: {Number(p.latitud).toFixed(7)}, {Number(p.longitud).toFixed(7)}</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Tipo</Text><Text style={styles.value}>{p.tipo || '—'}</Text>
        <Text style={styles.label}>Ubicación</Text><Text style={styles.value}>{p.municipio || p.ubicacion || '—'}</Text>
        <Text style={styles.label}>Superficie</Text><Text style={styles.value}>{p.superficie || '—'} {p.unidad_superficie || 'm²'}</Text>
        <Text style={styles.label}>Propietario interno</Text><Text style={styles.value}>{p.dueno_nombre || '—'}</Text>
      </View>
    </ScrollView>
  </ScreenContainer>;
}
const styles=StyleSheet.create({container:{padding:16,paddingBottom:100},center:{flex:1,justifyContent:'center',alignItems:'center'},title:{color:'#fff',fontSize:23,fontWeight:'800'},code:{color:'#777',fontSize:11,marginTop:4,marginBottom:15},card:{backgroundColor:'#171717',borderWidth:1,borderColor:'#2b2b2b',borderRadius:14,padding:16,marginBottom:12},label:{color:'#888',fontSize:12,marginTop:8},helper:{color:'#888',fontSize:11,lineHeight:16,marginTop:6},value:{color:'#fff',fontSize:15,fontWeight:'600',marginTop:3},actions:{flexDirection:'row',gap:10,marginTop:15},green:{flex:1,backgroundColor:'#15803d',padding:12,borderRadius:8,alignItems:'center'},red:{flex:1,backgroundColor:'#b91c1c',padding:12,borderRadius:8,alignItems:'center'},gold:{backgroundColor:'#9a7a25',padding:12,borderRadius:8,alignItems:'center',marginTop:10},btn:{color:'#fff',fontWeight:'800'},input:{backgroundColor:'#0f0f0f',borderWidth:1,borderColor:'#444',color:'#fff',borderRadius:8,padding:12,marginTop:7},mapBox:{height:280,borderRadius:12,overflow:'hidden',marginTop:10,borderWidth:1,borderColor:'#333'},mapHint:{position:'absolute',top:10,left:10,right:10,backgroundColor:'rgba(13,13,13,.82)',padding:8,borderRadius:8},mapHintText:{color:'#fff',fontSize:11,textAlign:'center'},saved:{color:'#7bbf8b',fontSize:11,marginTop:8}});
