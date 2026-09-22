import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import AuthBackground from "@/components/AuthBackground";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const signup = async () => {
    if (loading) return;
    if (!legalAccepted) {
      Alert.alert(
        "Términos obligatorios",
        "Debes leer y aceptar los términos antes de crear tu cuenta.",
      );
      setShowTerms(true);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validar correo
    if (!cleanEmail) {
      return Alert.alert(
        "Correo requerido",
        "Ingresa tu correo electrónico para continuar.",
      );
    }

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!emailIsValid) {
      return Alert.alert(
        "Correo no válido",
        "Ingresa una dirección de correo electrónico válida.",
      );
    }

    // Validar contraseña
    if (password.length < 6) {
      return Alert.alert(
        "Contraseña muy corta",
        "La contraseña debe tener al menos 6 caracteres.",
      );
    }

    // Confirmar contraseña
    if (password !== confirmPassword) {
      return Alert.alert(
        "Las contraseñas no coinciden",
        "Verifica que ambas contraseñas sean iguales.",
      );
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo:
            Platform.OS === "web"
              ? "https://auth.eyesite.mx/auth/callback"
              : "eyesite://auth/callback",
        },
      });

      if (error) {
        if (/rate limit|too many|hourly/i.test(error.message)) {
          Alert.alert(
            "Demasiados intentos",
            "Supabase detectó demasiados intentos. Espera un momento e inténtalo nuevamente.",
          );
          return;
        }

        if (
          /already registered|already exists|user already/i.test(error.message)
        ) {
          Alert.alert(
            "Correo ya registrado",
            "Este correo ya tiene una cuenta. Puedes iniciar sesión o recuperar tu contraseña.",
            [
              {
                text: "Iniciar sesión",
                onPress: () => router.replace("/(auth)/login" as never),
              },
              {
                text: "Cancelar",
                style: "cancel",
              },
            ],
          );
          return;
        }

        Alert.alert("No se pudo crear la cuenta", error.message);

        return;
      }

      // Cuenta creada pero requiere confirmar correo
      if (data.user && !data.session) {
        Alert.alert(
          "Verifica tu correo",
          `Te enviamos un enlace de confirmación a ${cleanEmail}. Revisa también la carpeta de spam.`,
          [
            {
              text: "Ir al inicio de sesión",
              onPress: () => router.replace("/(auth)/login" as never),
            },
          ],
        );

        return;
      }

      // Cuenta creada y sesión activa
      if (data.session) {
        router.replace("/(auth)/create-profile" as never);
        return;
      }

      Alert.alert(
        "Cuenta creada",
        "Tu cuenta fue creada correctamente. Ahora puedes iniciar sesión.",
        [
          {
            text: "Continuar",
            onPress: () => router.replace("/(auth)/login" as never),
          },
        ],
      );
    } catch {
      Alert.alert(
        "Error",
        "Ocurrió un problema inesperado. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* ENCABEZADO */}
            <View style={styles.header}>
              <Text style={styles.brand}>CREAR CUENTA</Text>

              <Text style={styles.subtitle}>
                Regístrate para empezar a buscar propiedades
              </Text>
            </View>

            {/* CORREO */}
            <View style={styles.field}>
              <Text style={styles.label}>CORREO ELECTRÓNICO</Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#888"
                  style={styles.inputIcon}
                />

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>
            </View>

            {/* CONTRASEÑA */}
            <View style={styles.field}>
              <Text style={styles.label}>CONTRASEÑA</Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#888"
                  style={styles.inputIcon}
                />

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />

                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={8}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#999"
                  />
                </Pressable>
              </View>
            </View>

            {/* CONFIRMAR CONTRASEÑA */}
            <View style={styles.field}>
              <Text style={styles.label}>CONFIRMAR CONTRASEÑA</Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#888"
                  style={styles.inputIcon}
                />

                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#666"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={signup}
                  style={styles.input}
                />

                <Pressable
                  onPress={() => setShowConfirmPassword((value) => !value)}
                  hitSlop={8}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={22}
                    color="#999"
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.legalBox}>
              <Pressable
                onPress={() => setShowTerms(true)}
                style={styles.legalRow}
              >
                <View
                  style={[styles.checkbox, legalAccepted && styles.checkboxOn]}
                >
                  {legalAccepted && (
                    <Ionicons name="checkmark" size={16} color="#0E0E0E" />
                  )}
                </View>
                <Text style={styles.legalText}>
                  He leído y acepto los Términos y Condiciones, Aviso de
                  Privacidad y tratamiento de datos.
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowTerms(true)}>
                <Text style={styles.legalLink}>LEER INFORMACIÓN COMPLETA</Text>
              </Pressable>
            </View>
            <Modal visible={showTerms} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    ANTES DE CREAR TU CUENTA
                  </Text>
                  <ScrollView style={styles.modalScroll}>
                    <Text style={styles.modalText}>
                      TÉRMINOS Y CONDICIONES EYESI+E\n\nLa información
                      inmobiliaria es referencial y debe verificarse con un
                      asesor. Te comprometes a proporcionar datos
                      veraces.\n\nAVISO DE PRIVACIDAD\n\nTus datos se utilizarán
                      para gestionar tu cuenta y contactarte sobre propiedades y
                      servicios de EYESI+E.\n\nTRATAMIENTO DE DATOS\n\nAutorizas
                      el contacto por WhatsApp, llamada o correo para atención
                      inmobiliaria.
                    </Text>
                  </ScrollView>
                  <Pressable
                    onPress={() => {
                      setLegalAccepted(true);
                      setShowTerms(false);
                    }}
                    style={styles.acceptTermsBtn}
                  >
                    <Text style={styles.acceptTermsText}>
                      HE LEÍDO Y ACEPTO
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowTerms(false)}
                    style={styles.closeTerms}
                  >
                    <Text style={styles.closeTermsText}>Cerrar</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            {/* BOTÓN */}
            <TouchableOpacity
              onPress={signup}
              disabled={loading}
              activeOpacity={0.8}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#0E0E0E" />

                  <Text style={styles.buttonText}>CREANDO CUENTA...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>REGISTRARME</Text>
              )}
            </TouchableOpacity>

            {/* LOGIN */}
            <View style={styles.footerContainer}>
              <Text style={styles.footer}>¿Ya tienes una cuenta? </Text>

              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={styles.link}>Iniciar sesión</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
  },

  header: {
    marginBottom: 28,
  },

  brand: {
    color: "#C9A84C",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },

  subtitle: {
    color: "#9A9A9A",
    fontSize: 14,
    lineHeight: 20,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    color: "#AFAFAF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 7,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    minHeight: 54,
  },

  inputIcon: {
    marginLeft: 14,
    marginRight: 8,
  },

  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 12,
  },

  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  legalBox: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  legalRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#777",
    borderRadius: 5,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#C9A84C", borderColor: "#C9A84C" },
  legalText: { color: "#C0C0C0", flex: 1, fontSize: 12, lineHeight: 18 },
  legalLink: {
    color: "#C9A84C",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#171717",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#C9A84C",
  },
  modalTitle: { color: "#C9A84C", fontSize: 18, fontWeight: "900" },
  modalScroll: { maxHeight: 420, marginVertical: 14 },
  modalText: { color: "#F5F5F5", fontSize: 14, lineHeight: 22 },
  acceptTermsBtn: {
    backgroundColor: "#C9A84C",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptTermsText: { color: "#0E0E0E", fontWeight: "900" },
  closeTerms: { padding: 12, alignItems: "center" },
  closeTermsText: { color: "#888" },
  button: {
    minHeight: 54,
    backgroundColor: "#C9A84C",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 22,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  buttonText: {
    color: "#0E0E0E",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 1,
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  footer: {
    color: "#8A8A8A",
    fontSize: 13,
  },

  link: {
    color: "#C9A84C",
    fontSize: 13,
    fontWeight: "700",
  },
});
