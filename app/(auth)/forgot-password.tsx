import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Ingresa tu correo electrónico");
      return;
    }

    try {
      setLoading(true);

      // Aquí conectaremos Supabase para enviar el correo

      Alert.alert(
        "Correo enviado",
        "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."
      );
    } catch {
      Alert.alert("Error", "No fue posible enviar el correo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>

      <Text style={styles.description}>
        Ingresa tu correo electrónico y te enviaremos instrucciones para
        recuperar tu contraseña.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <Pressable
        onPress={handleResetPassword}
        disabled={loading}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {loading ? "Enviando..." : "Restablecer contraseña"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.backText}>
          Volver al inicio de sesión
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 15,
  },
});