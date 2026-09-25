import { useState } from "react";
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (password.length < 6) {
      Alert.alert("Contraseña muy corta", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Las contraseñas no coinciden", "Verifica ambas contraseñas.");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("El enlace de recuperación ya no es válido. Solicita uno nuevo.");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      Alert.alert("Contraseña actualizada", "Tu contraseña fue cambiada correctamente.", [
        { text: "Continuar", onPress: () => router.replace("/(auth)/login" as never) },
      ]);
    } catch (error: any) {
      console.error("[reset-password]", error);
      Alert.alert("No se pudo actualizar", error?.message || "Solicita un nuevo enlace de recuperación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EYESITE</Text>
      <Text style={styles.title}>NUEVA CONTRASEÑA</Text>
      <Text style={styles.description}>Crea una nueva contraseña para tu cuenta.</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Nueva contraseña"
        placeholderTextColor="#777"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        editable={!saving}
      />
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Confirmar contraseña"
        placeholderTextColor="#777"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        editable={!saving}
      />

      <Pressable onPress={save} disabled={saving} style={[styles.button, saving && styles.disabled]}>
        {saving ? <ActivityIndicator color="#0E0E0E" /> : <Text style={styles.buttonText}>GUARDAR CONTRASEÑA</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#0E0E0E" },
  logo: { color: "#C9A84C", fontSize: 14, fontWeight: "900", letterSpacing: 3, textAlign: "center", marginBottom: 24 },
  title: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  description: { color: "#9A9A9A", fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  input: { height: 54, borderWidth: 1, borderColor: "#333", borderRadius: 10, paddingHorizontal: 16, marginBottom: 14, color: "#FFFFFF", backgroundColor: "#171717" },
  button: { height: 54, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#C9A84C" },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#0E0E0E", fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
});
