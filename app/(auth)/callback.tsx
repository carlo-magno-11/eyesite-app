import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { supabase } from "@/lib/supabase";


function getUrlParams(url: string) {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};

  // Web implicit-flow errors/sessions can arrive in the URL fragment.
  // expo-linking exposes query params separately, so parse the raw URL too.
  const hash = url.includes("#") ? url.split("#", 2)[1] : "";
  const fragment = new URLSearchParams(hash);

  const get = (name: string) => {
    const queryValue = query[name];
    if (typeof queryValue === "string") return queryValue;
    const fragmentValue = fragment.get(name);
    return fragmentValue;
  };

  return {
    code: get("code"),
    tokenHash: get("token_hash"),
    type: get("type") || "email",
    error: get("error"),
    errorCode: get("error_code"),
    errorDescription: get("error_description"),
  };
}

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState("Verificando tu enlace...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledUrlRef = useRef<string | null>(null);
  const recoveryRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const goToRecovery = () => {
      if (!mounted) return;
      recoveryRef.current = true;
      router.replace("/reset-password" as never);
    };

    const authSubscription = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") goToRecovery();
    });

    const handleUrl = async (url: string) => {
      if (!url || handledUrlRef.current === url) return;
      handledUrlRef.current = url;

      try {
        setMessage("Confirmando tu cuenta...");
        setErrorMessage(null);

        const { code, tokenHash, type, error, errorCode, errorDescription } =
          getUrlParams(url);

        if (error || errorCode) {
          throw new Error(
            errorDescription ||
              (errorCode === "otp_expired"
                ? "El enlace de verificación expiró o ya fue utilizado. Solicita un correo nuevo."
                : "El enlace de autenticación no es válido."),
          );
        }

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash) {
          const otpType = type === "recovery" ? "recovery" : "email";
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (verifyError) throw verifyError;
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session && type === "recovery") {
            goToRecovery();
            return;
          }

          // The web callback is hosted by Hostinger. This Expo route is
          // primarily for the native eyesite:// deep link.
          throw new Error(
            "El enlace no contiene un código válido. Solicita uno nuevo.",
          );
        }

        if (!mounted) return;

        if (type === "recovery" || recoveryRef.current) {
          goToRecovery();
          return;
        }

        setMessage("¡Correo confirmado correctamente!");
        setTimeout(() => {
          if (mounted) router.replace("/(auth)/login" as never);
        }, 900);
      } catch (error: any) {
        console.error("[EYESITE] auth callback error:", error);
        if (!mounted) return;
        setErrorMessage(
          error?.message ||
            "No pudimos procesar el enlace. Solicita uno nuevo.",
        );
        setMessage("No se pudo procesar el enlace.");
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (url) void handleUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EYESITE</Text>
      {!errorMessage && (
        <ActivityIndicator
          size="large"
          color="#C9A84C"
          style={styles.spinner}
        />
      )}
      <Text style={styles.message}>{message}</Text>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#0E0E0E",
  },
  logo: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#C9A84C",
  },
  spinner: { marginTop: 24 },
  message: {
    marginTop: 20,
    fontSize: 17,
    textAlign: "center",
    color: "#FFFFFF",
  },
  error: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#FF6B6B",
  },
});
