import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminPanel() {
  const { profile, loading: authLoading } = useAuth();
  const { solicitudes, loadingPendientes, error } = useAdminData();
  const abrirSolicitud = (id: string) => router.push(`/admin/solicitud/${id}` as any);

  if (authLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}><ActivityIndicator color='#C9A84C' /></View>;
  }
  if (profile?.role !== 'admin' || profile?.estado !== 'activa') {
    return <Redirect href='/' />;
  }

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

          <TouchableOpacity
            onPress={() => abrirSolicitud(item.id)}
            style={{ marginTop: 12, backgroundColor: '#C9A84C', padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#111', textAlign: 'center', fontWeight: 'bold' }}>Revisar solicitud</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}