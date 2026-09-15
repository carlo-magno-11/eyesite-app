import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { View, ActivityIndicator, Text, StatusBar } from "react-native";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://2b9f8a4dc404528b87957977fe39da0c@o4512088794333184.ingest.us.sentry.io/4512088804556800",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: false,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

function Splash() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <StatusBar barStyle="light-content" />
      <Text
        style={{
          fontSize: 32,
          fontWeight: "900",
          color: "white",
          letterSpacing: 1,
        }}
      >
        EYESITE
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: "#94A3B8",
          marginTop: 8,
          letterSpacing: 3,
        }}
      >
        PROPERTIES
      </Text>
      <ActivityIndicator color="white" style={{ marginTop: 24 }} />
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const termsOk =
    !!profile?.terminos_aceptados && profile?.terminos_version === "v1.0";
  const router = useRouter();
  const segments = useSegments();
  const current = segments.join("/");

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    const inTerms = segments[0] === "terms";
    const inPending = segments[0] === "pending";
    const inDenied = segments[0] === "denied";
    const isProtected = !inAuth && !inTerms && !inPending && !inDenied;

    if (!session && isProtected && current !== "(auth)/login") {
      router.replace("/(auth)/login" as never);
      return;
    }
    if (session && !profile && !inAuth && current !== "create-profile") {
      router.replace("/(auth)/create-profile" as never);
      return;
    }
    if (session && profile && !termsOk && !inTerms && !inAuth) {
      router.replace("/terms" as never);
      return;
    }
    if (session && termsOk) {
      if (profile?.estado === "pendiente" && !inPending)
        router.replace("/pending" as never);
      else if (
        (profile?.estado === "rechazado" || profile?.estado === "suspendida") &&
        !inDenied
      )
        router.replace("/denied" as never);
      else if (
        profile?.estado === "activa" &&
        (inAuth || inTerms || inPending || inDenied)
      )
        router.replace("/(tabs)" as never);
      else if (!profile?.estado && isProtected)
        router.replace("/(auth)/create-profile" as never);
    }
  }, [session, profile, loading, termsOk, current, router, segments]);

  if (loading) return <Splash />;
  return <>{children}</>;
}

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  contentStyle: { backgroundColor: "#fff" },
                }}
              />
            </AuthGate>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
});
