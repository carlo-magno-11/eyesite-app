import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
const PASSWORD_ADMIN = "terrenos2024";

export default function AdminPanel() {
  const [pass, setPass] = useState("");
  const [auth, setAuth] = useState(false);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [motivo, setMotivo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cargarPendientes = async () => {
    // TU TABLA SE LLAMA ASI EN TU HOOK, NO 'solicitudes_propiedades'
    const { data, error } = await supabase.from('solicitudes_propiedades').select('*').ilike('estado', 'Pendiente').order('created_at', { ascending: false });
    if(error) console.log(error);
    if(data) setSolicitudes(data);
  };

  useEffect(() => { if(auth) cargarPendientes(); }, [auth]);

  const aprobar = async (id: string) => {
  // 1. Busca la solicitud
  const { data: sol } = await supabase.from('solicitudes_propiedades').select('*').eq('id', id).single();
  if(!sol) return;

  // 2. La crea en la tabla real que ve la app
  const { error } = await supabase.from('propiedades').insert({
    titulo: sol.titulo,
    precio: sol.precio,
    descripcion: sol.descripcion,
    ubicacion: sol.ubicacion,
    imagenes: sol.imagenes,
    estado: 'Activa - Visible en app',
    tipo: sol.tipo || 'venta'
  });

  if(error) { Alert.alert("Error", error.message); return; }

  // 3. Marca la solicitud como aprobada
  await supabase.from('solicitudes_propiedades').update({ estado: 'aprobada' }).eq('id', id);
  
  Alert.alert("Listo", "Publicado ✅");
  cargarPendientes();
};

  const rechazar = async () => {
    if(!motivo) return Alert.alert("Escribe el motivo");
    await supabase.from('solicitud_propiedades').update({ estado: 'rechazada', motivo_rechazo: motivo }).eq('id', selectedId);
    setMotivo(""); setSelectedId(null);
    Alert.alert("Rechazado");
    cargarPendientes();
  };

  if(!auth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 30, backgroundColor: 'white' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Panel Admin</Text>
        <TextInput placeholder="Contraseña" secureTextEntry value={pass} onChangeText={setPass} style={{ borderWidth: 1, padding: 15, borderRadius: 10, marginBottom: 15 }} />
        <TouchableOpacity onPress={() => pass === PASSWORD_ADMIN? setAuth(true) : Alert.alert("Contraseña incorrecta")} style={{ backgroundColor: 'black', padding: 15, borderRadius: 10 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Entrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 15, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15 }}>Pendientes ({solicitudes.length})</Text>
      {solicitudes.map(item => (
        <View key={item.id} style={{ backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.titulo} - {item.precio}</Text>
          <Text>{item.descripcion}</Text>
          {selectedId === item.id? (
            <View style={{ marginTop: 10 }}>
              <TextInput placeholder="¿Por qué lo rechazas?" value={motivo} onChangeText={setMotivo} style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 10 }} multiline />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={rechazar} style={{ flex: 1, backgroundColor: 'red', padding: 12, borderRadius: 8 }}><Text style={{ color: 'white', textAlign: 'center' }}>Confirmar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedId(null)} style={{ flex: 1, backgroundColor: 'gray', padding: 12, borderRadius: 8 }}><Text style={{ color: 'white', textAlign: 'center' }}>Cancelar</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={() => aprobar(item.id)} style={{ flex: 1, backgroundColor: '#22c55e', padding: 12, borderRadius: 8 }}><Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>✓ Aceptar</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedId(item.id)} style={{ flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 8 }}><Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>X Rechazar</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}