import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { registerPushToken } from "@/hooks/use-notifications";
import { useEffect } from "react";
import { View, ActivityIndicator, Text, StatusBar, Platform } from "react-native";
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { supabase } from "@/lib/supabase";
import { addAppBreadcrumb, reportAppError, setAppMonitoringContext } from "@/lib/monitoring";

Sentry.init({
  dsn: "https://2b9f8a4dc404528b87957977fe39da0c@o4512088794333184.ingest.us.sentry.io/4512088804556800",
  sendDefaultPii: false,
  // Diagnóstico de errores sin grabación de sesiones ni formularios de feedback de terceros.
  enableLogs: false,
  release: `eyesite@${Constants.expoConfig?.version ?? "unknown"}`,
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

function Splash() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
      <StatusBar barStyle="light-content" />
      <Text style={{ fontSize: 32, fontWeight: "900", color: "white", letterSpacing: 1 }}>EYESITE</Text>
      <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 8, letterSpacing: 3 }}>PROPERTIES</Text>
      <ActivityIndicator color="white" style={{ marginTop: 24 }} />
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const termsOk = !!profile?.terminos_aceptados && profile.terminos_version === "v1.0";
  const router = useRouter();
  const segments = useSegments();
  const current = segments.join("/");

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "(auth)";
    const inTerms = segments[0] === "terms";
    const inPending = segments[0] === "pending";
    const inDenied = segments[0] === "denied";
    const inVerifyEmail = segments[0] === "verify-email";
    const inCreateProfile = segments[0] === "(auth)" && segments[1] === "create-profile";
    const isProtected = !inAuth && !inTerms && !inPending && !inDenied && !inVerifyEmail && !inCreateProfile;
    const emailConfirmed = !!session?.user?.email_confirmed_at;

    if (!session && isProtected && current !== "(auth)/login") {
      router.replace("/(auth)/login" as never);
      return;
    }

    if (session && !emailConfirmed && !inAuth && !inVerifyEmail) {
      router.replace("/verify-email" as never);
      return;
    }

    if (session && emailConfirmed && !profile && !inAuth && current !== "create-profile") {
      router.replace("/(auth)/create-profile" as never);
      return;
    }

    if (session && emailConfirmed && profile && !termsOk && !inTerms && !inAuth) {
      router.replace("/terms" as never);
      return;
    }

    if (session && emailConfirmed && termsOk) {
      if (profile?.estado === "pendiente" && !inPending) {
        router.replace("/pending" as never);
      } else if ((profile?.estado === "rechazado" || profile?.estado === "suspendida") && !inDenied) {
        router.replace("/denied" as never);
      } else if (profile?.estado === "activa" && (inAuth || inTerms || inPending || inDenied || inVerifyEmail)) {
        router.replace("/(tabs)" as never);
      } else if (!profile?.estado && isProtected) {
        router.replace("/(auth)/create-profile" as never);
      }
    }
  }, [session, profile, loading, termsOk, current, router, segments]);

  useEffect(() => {
    if (session?.user?.id && profile?.estado === "activa" && session.user.email_confirmed_at) {
      void registerPushToken(session.user.id);
    }
  }, [session?.user?.id, profile?.estado, session?.user?.email_confirmed_at]);

  if (loading) return <Splash />;
  return <>{children}</>;
}

export default Sentry.wrap(function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    setAppMonitoringContext();
    addAppBreadcrumb("EYESITE inició el monitoreo de la sesión");
    let mounted = true;
    let responseSubscription: { remove: () => void } | undefined;

    const openNotification = (response: any) => {
      const data = (response?.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
      const propertyId = typeof data.property_id === "string" ? data.property_id : null;
      const announcementId = typeof data.announcement_id === "string" ? data.announcement_id : null;

      if (propertyId) {
        router.push({
          pathname: "/property/[id]",
          params: { id: propertyId },
        } as never);
        return;
      }

      if (announcementId) {
        addAppBreadcrumb("Notificación abierta", { hasProperty: false, hasAnnouncement: true }, "notification");
        void supabase.rpc("registrar_anuncio_evento", {
          p_announcement_id: announcementId,
          p_evento: "opened",
        });
        router.push({
          pathname: "/notifications",
          params: { announcement_id: announcementId },
        } as never);
        return;
      }

      router.push("/notifications" as never);
    };

    // Expo Notifications response listeners are native-only. Web keeps the
    // same in-app notification center through Supabase Realtime.
    if (Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
      return () => {
        mounted = false;
      };
    }

    void import("expo-notifications").then(async (Notifications) => {
      if (!mounted) return;

      responseSubscription = Notifications.addNotificationResponseReceivedListener(openNotification);

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (mounted && lastResponse) {
        openNotification(lastResponse);
      }
    }).catch((error) => {
      reportAppError(error, { area: "notifications", action: "register_response_listener" });
    });

    return () => {
      mounted = false;
      responseSubscription?.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: "#fff" }}} />
            </AuthGate>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
});
