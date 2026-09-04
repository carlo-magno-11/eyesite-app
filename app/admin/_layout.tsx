import { Stack } from 'expo-router';

export default function AdminLayout() {
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
        name="estadisticas"
        options={{
          title: 'Estadísticas',
        }}
      />
    </Stack>
  );
}
