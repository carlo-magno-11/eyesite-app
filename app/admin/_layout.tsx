import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout() {
  const { profile, loading } = useAuth();

  // Defensa en profundidad: TODA la sección /admin exige profile.role === 'admin'.
  // Antes solo solicitudes.tsx tenía un password hardcodeado en texto plano;
  // el resto del panel (users.tsx, propiedades.tsx, estadisticas.tsx,
  // solicitud/[id].tsx) quedaba abierto a cualquier usuario autenticado.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' }}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  if (profile?.role !== 'admin') {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0D0D0D',
        },
        headerTintColor: '#C9A84C',
        headerTitleStyle: {
          fontWeight: '700',
          color: '#FFFFFF',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Panel Admin EYESITE',
        }}
      />
      <Stack.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes Pendientes',
        }}
      />
      <Stack.Screen
        name="solicitud/[id]"
        options={{
          title: 'Revisar Solicitud',
        }}
      />
      <Stack.Screen
        name="propiedades"
        options={{
          title: 'Propiedades Publicadas',
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'Usuarios',
        }}
      />
      <Stack.Screen
        name="estadisticas"
        options={{
          title: 'Estadísticas',
        }}
      />
    </Stack>
  );
}