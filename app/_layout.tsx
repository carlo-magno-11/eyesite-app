import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { registerPushToken } from "@/hooks/use-notifications";
import { useEffect } from "react";
import { StatusBar, Platform } from "react-native";
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { supabase } from "@/lib/supabase";
import { addAppBreadcrumb, reportAppError, setAppMonitoringContext } from "@/lib/monitoring";
import EyesiteLaunchSplash from "@/components/EyesiteLaunchSplash";

Sentry.init({
  dsn: "https://2b9f8a4dc404528b87957977fe39da0c@o4512088794333184.ingest.us.sentry.io/4512088804556800",
  sendDefaultPii: false,
  // Diagnóstico de errores sin grabación de sesiones ni formularios de feedback de terceros.
  enableLogs: false,
  release: `eyesite@${Constants.expoConfig?.version ?? "unknown"}`,
});

// Expo can return the same last notification response whenever RootLayout dependencies change.
// Keep response IDs process-wide so deep links/analytics are handled once.
const handledNotificationResponseIds = new Set<string>();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

function Splash() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <EyesiteLaunchSplash />
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const termsOk = !!profile?.terminos_aceptados && profile.terminos_version === "v1.0";
  const router = useRouter();
  const segments = useSegments();
  const segmentList = segments as string[];
  const current = segmentList.join("/");

  useEffect(() => {
    if (loading) return;

    const inAuth = segmentList[0] === "(auth)";
    const inTerms = segmentList[0] === "terms";
    const inPending = segmentList[0] === "pending";
    const inDenied = segmentList[0] === "denied";
    const inVerifyEmail = segmentList[0] === "verify-email";
    const inResetPassword = segmentList[0] === "reset-password";
    const inCreateProfile = segmentList[0] === "(auth)" && segmentList[1] === "create-profile";
    const inAuthCallback = segmentList[0] === "(auth)" && segmentList[1] === "callback";

    // Apple App Review: the public property-discovery experience does not
    // require an account. Account-only actions (favorites, publishing,
    // profile, notifications, requests, etc.) still remain behind AuthGate.
    const inPublicContent =
      (segmentList[0] === "(tabs)" &&
        ["index", "properties", "map", "contact"].includes(segmentList[1] ?? "")) ||
      segmentList[0] === "property" ||
      segmentList[0] === "about" ||
      segmentList[0] === "privacy";

    const isProtected =
      !inAuth &&
      !inTerms &&
      !inPending &&
      !inDenied &&
      !inVerifyEmail &&
      !inCreateProfile &&
      !inResetPassword &&
      !inPublicContent;
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

    if (session && emailConfirmed && profile) {
      // Access state takes precedence over terms. A rejected/suspended account
      // must never be sent through the terms flow, and a pending account must
      // remain in the approval flow until an admin activates it.
      if ((profile.estado === "rechazado" || profile.estado === "suspendida")) {
        if (!inDenied) router.replace("/denied" as never);
        return;
      }

      if (profile.estado === "pendiente") {
        if (!inPending) router.replace("/pending" as never);
        return;
      }

      if (profile.estado === "activa") {
        if (!termsOk && !inTerms && !inAuth) {
          router.replace("/terms" as never);
          return;
        }

        if (termsOk && (inAuth || inTerms || inPending || inDenied || inVerifyEmail) && !inAuthCallback) {
          router.replace("/(tabs)" as never);
          return;
        }
      } else if (!profile.estado && isProtected) {
        router.replace("/(auth)/create-profile" as never);
        return;
      }
    }
  }, [session, profile, loading, termsOk, current, router, segmentList]);

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
  const { session, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    setAppMonitoringContext();
    addAppBreadcrumb("EYESITE inició el monitoreo de la sesión");
    let mounted = true;
    let responseSubscription: { remove: () => void } | undefined;

    const openNotification = (response: any) => {
      // Push/deep-link navigation must never outrun AuthGate. A stale push
      // response can exist after logout, account suspension, or before profile
      // loading completes, so require the same active-account conditions used
      // by protected navigation.
      const termsOk = !!profile?.terminos_aceptados && profile.terminos_version === "v1.0";
      const emailConfirmed = !!session?.user?.email_confirmed_at;
      if (
        authLoading ||
        !session?.user?.id ||
        !emailConfirmed ||
        profile?.estado !== "activa" ||
        !termsOk
      ) {
        return;
      }

      const responseId = response?.notification?.request?.identifier;
      if (typeof responseId === "string" && handledNotificationResponseIds.has(responseId)) {
        return;
      }
      if (typeof responseId === "string") {
        handledNotificationResponseIds.add(responseId);
      }

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

      // Permite que una notificación push también sea visible cuando la app
      // está en primer plano. El centro in-app sigue funcionando por separado.
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

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
  }, [router, authLoading, profile?.estado, profile?.terminos_aceptados, profile?.terminos_version, session?.user?.id, session?.user?.email_confirmed_at]);

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
