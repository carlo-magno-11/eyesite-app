import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme-provider';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const [termsOk, setTermsOk] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments() as unknown as string[];

  useEffect(() => {
    AsyncStorage.getItem('terms_v1').then((v) => setTermsOk(v === 'true'));
  }, []);

  useEffect(() => {
    // Evita flash / loops mientras se resuelve sesión o AsyncStorage.
    if (loading || termsOk === null) return;

    const first = segments[0] ?? '';
    const second = segments[1] ?? '';
    const current = segments.join('/');

    const inAuth = first === '(auth)';
    const inRegister = inAuth && second === 'register';
    const inCreateProfile = inAuth && second === 'create-profile';
    const inTerms = first === 'terms';
    const inPending = first === 'pending';
    const inDenied = first === 'denied';
    const inTabs = first === '(tabs)';

    let target: string | null = null;

    if (!session) {
      // Sin sesión: solo quedarse dentro de la zona auth/terms; cualquier otra ruta -> login.
      if (!inAuth && !inTerms) target = '/(auth)/login';
    } else if (!termsOk) {
      // Con sesión pero sin términos: login -> /terms; NO secuestrar registro / crear-perfil.
      if (!inTerms && !inRegister && !inCreateProfile) target = '/terms';
    } else {
      const estado = profile?.estado;
      if (estado === 'pendiente') {
        if (!inPending && !inAuth) target = '/pending';
      } else if (estado === 'rechazado') {
        if (!inDenied && !inAuth) target = '/denied';
      } else if (estado === 'activa') {
        // Puede navegar a tabs/propiedades; sacarla solo de auth/terms/pending/denied.
        if (inAuth || inTerms || inPending || inDenied) target = '/(tabs)';
      } else if (!inAuth && !inTerms && !inPending && !inDenied) {
        // Perfil sin estado -> completar perfil (evita quedar atrapado en pantallas).
        target = '/(auth)/create-profile';
      }
    }

    // Anti-loop: solo reemplaza si la ruta destino difiere de la actual.
    if (target) {
      const targetKey = target.replace(/^\//, '');
      if (targetKey !== current) {
        router.replace(target as never);
      }
    }
  }, [session, profile, loading, termsOk, segments, router]);

  if (loading || termsOk === null) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }} />
            </AuthGate>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}