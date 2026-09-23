import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { supabase } from "@/lib/supabase";

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState("Verificando tu correo...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let handled = false;

    const handleUrl = async (url: string) => {
      if (handled) return;
      handled = true;

      try {
        setMessage("Confirmando tu cuenta...");
        setErrorMessage(null);

        const parsed = Linking.parse(url);

        const code =
          typeof parsed.queryParams?.code === "string"
            ? parsed.queryParams.code
            : null;

        const tokenHash =
          typeof parsed.queryParams?.token_hash === "string"
            ? parsed.queryParams.token_hash
            : null;

        const type =
          typeof parsed.queryParams?.type === "string"
            ? parsed.queryParams.type
            : "email";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email" | "recovery",
          });

          if (error) {
            throw error;
          }
        } else {
          throw new Error(
            "El enlace de confirmación no contiene un código válido.",
          );
        }

        if (!mounted) return;

        if (type === "recovery") {
          router.replace("/reset-password" as never);
          return;
        }

        setMessage("¡Correo confirmado correctamente!");
      } catch (error: any) {
        console.error("[EYESITE] auth callback error:", error);

        if (!mounted) return;

        setErrorMessage(
          error?.message ||
            "No pudimos confirmar el correo. Solicita un nuevo enlace.",
        );

        setMessage("No se pudo confirmar tu cuenta.");
      }
    };

    const run = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        await handleUrl(initialUrl);
      }
    };

    void run();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
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

  spinner: {
    marginTop: 24,
  },

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
