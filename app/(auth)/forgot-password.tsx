import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert("Correo requerido", "Ingresa tu correo electrónico.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert("Correo inválido", "Ingresa una dirección de correo válida.");
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: "https://auth.eyesite.mx/auth/callback?type=recovery",
      });

      if (error) {
        if (/rate limit|too many|hourly/i.test(error.message)) {
          throw new Error("Se alcanzó el límite de envíos. Espera unos minutos e inténtalo nuevamente.");
        }
        // Do not surface provider details that could reveal account state or internals.
        throw new Error("No pudimos procesar la solicitud. Si la cuenta existe, recibirás un enlace.");
      }

      Alert.alert(
        "Revisa tu correo",
        "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también spam.",
        [{ text: "Volver al inicio de sesión", onPress: () => router.replace("/(auth)/login" as never) }],
      );
    } catch (error: any) {
      console.error("[forgot-password]", error);
      Alert.alert("No se pudo enviar", error?.message || "Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EYESITE</Text>
      <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
      <Text style={styles.description}>
        Ingresa tu correo electrónico y te enviaremos un enlace seguro para crear una nueva contraseña.
      </Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Correo electrónico" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={styles.input} editable={!loading}/>
      <Pressable onPress={handleResetPassword} disabled={loading} style={[styles.button, loading && styles.disabled]}>
        {loading ? <ActivityIndicator color="#0E0E0E" /> : <Text style={styles.buttonText}>ENVIAR ENLACE</Text>}
      </Pressable>
      <Pressable onPress={() => router.back()} disabled={loading}><Text style={styles.backText}>Volver al inicio de sesión</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#0E0E0E" },
  logo: { color: "#C9A84C", fontSize: 14, fontWeight: "900", letterSpacing: 3, textAlign: "center", marginBottom: 24 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  description: { color: "#9A9A9A", fontSize: 15, lineHeight: 23, marginBottom: 24, textAlign: "center" },
  input: { height: 52, borderWidth: 1, borderColor: "#333", borderRadius: 10, paddingHorizontal: 16, marginBottom: 16, color: "#FFFFFF", backgroundColor: "#171717" },
  button: { height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#C9A84C" },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#0E0E0E", fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  backText: { color: "#C9A84C", textAlign: "center", marginTop: 20, fontSize: 15, fontWeight: "700" },
});