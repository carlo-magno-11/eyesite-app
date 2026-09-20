import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function VerifyEmailScreen() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? "");
    });
    return () => { mounted = false; };
  }, []);

  const resend = async () => {
    if (!email || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: "eyesite://auth/callback" },
      });
      if (error) throw error;
      Alert.alert("Correo enviado", "Revisa " + email + " y también la carpeta de spam.");
    } catch (error: any) {
      Alert.alert("No se pudo reenviar", error?.message || "Inténtalo nuevamente en unos minutos.");
    } finally {
      setSending(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login" as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EYESITE</Text>
      <Text style={styles.title}>VERIFICA TU CORREO</Text>
      <Text style={styles.text}>Antes de continuar, confirma tu correo electrónico.</Text>
      <Text style={styles.email}>{email || "Tu correo registrado"}</Text>
      <Pressable onPress={resend} disabled={sending} style={[styles.button, sending && styles.disabled]}>
        <Text style={styles.buttonText}>{sending ? "ENVIANDO..." : "REENVIAR VERIFICACIÓN"}</Text>
      </Pressable>
      <Pressable onPress={logout} style={styles.secondary}>
        <Text style={styles.secondaryText}>VOLVER A INICIAR SESIÓN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E0E0E", alignItems: "center", justifyContent: "center", padding: 28 },
  logo: { color: "#C9A84C", fontSize: 30, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", marginTop: 28, textAlign: "center" },
  text: { color: "#AFAFAF", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 14 },
  email: { color: "#C9A84C", fontSize: 15, fontWeight: "700", marginTop: 12, textAlign: "center" },
  button: { width: "100%", maxWidth: 420, minHeight: 54, marginTop: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#C9A84C" },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#0E0E0E", fontWeight: "900", letterSpacing: 0.7 },
  secondary: { marginTop: 18, padding: 12 },
  secondaryText: { color: "#C9A84C", fontWeight: "800" },
});
