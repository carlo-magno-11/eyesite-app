import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminPanel() {
  const { profile, loading: authLoading } = useAuth();
  const { solicitudes, loadingPendientes, error, aprobar, rechazar } = useAdminData();
  const [motivo, setMotivo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Gate de seguridad REAL: ya NO existe password hardcodeado ──
  // (el password en texto plano se eliminó de este archivo).
  // Solo entra un usuario cuyo profiles.role === 'admin'.
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  if (profile?.role !== 'admin') {
    return <Redirect href="/" />;
  }

  const onAprobar = async (id: string) => {
    const result = await aprobar(id);
    if (!result.ok) return Alert.alert('Error', result.message ?? 'No se pudo aprobar');
    Alert.alert('Listo', 'Publicado ✅');
  };

  const onRechazar = async () => {
    if (!motivo) return Alert.alert('Escribe el motivo');
    if (!selectedId) return;
    const result = await rechazar(selectedId, motivo);
    if (!result.ok) return Alert.alert('Error', result.message ?? 'No se pudo rechazar');
    setMotivo('');
    setSelectedId(null);
    Alert.alert('Rechazado');
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15 }}>
        Pendientes ({solicitudes.length})
      </Text>

      {error && <Text style={{ color: '#ef4444', marginBottom: 12 }}>⚠ {error}</Text>}

      {loadingPendientes && solicitudes.length === 0 && (
        <ActivityIndicator style={{ marginTop: 24 }} color="#C9A84C" />
      )}

      {solicitudes.map((item) => (
        <View key={item.id} style={{ backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
            {item.titulo} - {item.precio ?? item.precio_actual ?? '—'}
          </Text>
          <Text>{item.descripcion}</Text>

          {selectedId === item.id ? (
            <View style={{ marginTop: 10 }}>
              <TextInput
                placeholder="¿Por qué lo rechazas?"
                value={motivo}
                onChangeText={setMotivo}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 10 }}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={onRechazar}
                  style={{ flex: 1, backgroundColor: 'red', padding: 12, borderRadius: 8 }}
                >
                  <Text style={{ color: 'white', textAlign: 'center' }}>Confirmar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedId(null);
                    setMotivo('');
                  }}
                  style={{ flex: 1, backgroundColor: 'gray', padding: 12, borderRadius: 8 }}
                >
                  <Text style={{ color: 'white', textAlign: 'center' }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => onAprobar(item.id)}
                style={{ flex: 1, backgroundColor: '#22c55e', padding: 12, borderRadius: 8 }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>✓ Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedId(item.id)}
                style={{ flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 8 }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>X Rechazar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}