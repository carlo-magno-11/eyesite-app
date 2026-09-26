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
import { useResponsive } from "@/hooks/use-responsive";
import { useI18n } from "@/lib/i18n";

export default function RegisterScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [presupuesto, setPresupuesto] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const passwordChecks = {
    length: password.length >= 8,
    number: /\d/.test(password),
    upper: /[A-ZÁÉÍÓÚÑ]/.test(password),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordLabel = passwordScore <= 1 ? t("passwordWeak") : passwordScore === 2 ? t("passwordGood") : t("passwordStrong");

  const signup = async () => {
    if (loading) return;
    if (!legalAccepted) {
      Alert.alert(
        t("requiredTerms"),
        t("requiredTermsDescription"),
      );
      setShowTerms(true);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validar correo
    if (!cleanEmail) {
      return Alert.alert(
        t("requiredEmail"),
        t("enterEmail"),
      );
    }

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!emailIsValid) {
      return Alert.alert(
        t("invalidEmailAddress"),
        t("invalidEmailAddress"),
      );
    }

    const cleanNombre = nombre.trim();
    const cleanTelefono = telefono.trim().replace(/\D/g, "");
    const cleanCiudad = ciudad.trim();
    const cleanPresupuesto = presupuesto.trim();

    if (!cleanNombre) {
      return Alert.alert(t("requiredName"), t("enterFullName"));
    }
    if (cleanTelefono.length < 10) {
      return Alert.alert(t("invalidPhone"), t("validPhone"));
    }
    if (!cleanCiudad) {
      return Alert.alert(t("requiredCity"), t("enterCity"));
    }

    // Validar contraseña
    if (password.length < 8 || !passwordChecks.number || !passwordChecks.upper) {
      return Alert.alert(
        t("weakPassword"),
        t("passwordRequirements"),
      );
    }

    // Confirmar contraseña
    if (password !== confirmPassword) {
      return Alert.alert(
        t("passwordsMismatch"),
        t("passwordsMismatchDescription"),
      );
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            nombre: cleanNombre,
            telefono: cleanTelefono,
            ciudad: cleanCiudad,
            presupuesto: cleanPresupuesto,
          },
          emailRedirectTo:
            Platform.OS === "web"
              ? "https://auth.eyesite.mx/auth/callback"
              : "eyesite://auth/callback",
        },
      });

      if (error) {
        if (/rate limit|too many|hourly/i.test(error.message)) {
          Alert.alert(
            t("tooManyAttempts"),
            t("tooManyAttemptsDescription"),
          );
          return;
        }

        if (
          /already registered|already exists|user already/i.test(error.message)
        ) {
          Alert.alert(
            t("emailRegistered"),
            t("emailRegisteredDescription"),
            [
              {
                text: t("signIn"),
                onPress: () => router.replace("/(auth)/login" as never),
              },
              {
                text: t("cancel"),
                style: "cancel",
              },
            ],
          );
          return;
        }

        Alert.alert(t("accountCreateFailed"), error.message);

        return;
      }

      // Cuenta creada pero requiere confirmar correo
      if (data.user && !data.session) {
        setConfirmationEmail(cleanEmail);
        return;
      }

      // Cuenta creada y sesión activa
      if (data.session) {
        router.replace("/(auth)/create-profile" as never);
        return;
      }

      Alert.alert(
        t("accountCreated"),
        t("accountCreatedDescription"),
        [
          {
            text: t("continue"),
            onPress: () => router.replace("/(auth)/login" as never),
          },
        ],
      );
    } catch {
      Alert.alert(
        t("unexpectedProblem"),
        t("unexpectedProblemDescription"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      {confirmationEmail ? (
        <View style={styles.confirmationScreen}>
          <View style={styles.confirmationCard}>
            <Ionicons name="mail-outline" size={56} color="#C9A84C" />
            <Text style={styles.confirmationTitle}>{t("confirmEmailTitle")}</Text>
            <Text style={styles.confirmationText}>{t("accountCreatedCorrectly")}</Text>
            <Text style={styles.confirmationText}>{t("confirmationSent")}</Text>
            <Text style={styles.confirmationEmail}>{confirmationEmail}</Text>
            <Text style={styles.confirmationHint}>
              {t("checkSpam")}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login" as never)}
              style={styles.button}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>IR A INICIAR SESIÓN</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, isDesktop && styles.desktopContainer]}>
            {/* ENCABEZADO */}
            <View style={styles.header}>
              <Text style={styles.brand}>{t("registerAccount")}</Text>

              <Text style={styles.subtitle}>
                {t("registerSubtitle")}
              </Text>
            </View>

            {/* CORREO */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("email")}</Text>

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

            {/* DATOS DEL PERFIL */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("fullName")}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput value={nombre} onChangeText={setNombre} placeholder={t("fullNamePlaceholder")} placeholderTextColor="#666" autoCapitalize="words" autoCorrect={false} style={styles.input} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("phoneWhatsapp")}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput value={telefono} onChangeText={setTelefono} placeholder={t("phonePlaceholder")} placeholderTextColor="#666" keyboardType="phone-pad" style={styles.input} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("cityZone")}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="location-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput value={ciudad} onChangeText={setCiudad} placeholder={t("cityPlaceholder")} placeholderTextColor="#666" autoCapitalize="words" autoCorrect={false} style={styles.input} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("budgetOptional")} <Text style={styles.optional}>({t("optional")})</Text></Text>
              <View style={styles.inputWrap}>
                <Ionicons name="cash-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput value={presupuesto} onChangeText={setPresupuesto} placeholder={t("budgetPlaceholder")} placeholderTextColor="#666" keyboardType="default" style={styles.input} />
              </View>
            </View>

            {/* CONTRASEÑA */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("password")}</Text>

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
                  placeholder={t("passwordMin")}
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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
              {(passwordFocused || password.length > 0) && (
                <View style={styles.passwordGuide}>
                  <View style={styles.passwordGuideHeader}>
                    <Text style={styles.passwordGuideTitle}>{t("security")}: {passwordLabel.toUpperCase()}</Text>
                    <Text style={styles.passwordGuideScore}>{passwordScore}/3</Text>
                  </View>
                  <View style={styles.passwordBarTrack}>
                    <View style={[styles.passwordBar, { width: passwordScore === 0 ? "8%" : passwordScore === 1 ? "33%" : passwordScore === 2 ? "66%" : "100%" }]} />
                  </View>
                  <Text style={styles.passwordRule}>• {passwordChecks.length ? "✓" : "○"} {t("charactersMore")}</Text>
                  <Text style={styles.passwordRule}>• {passwordChecks.upper ? "✓" : "○"} {t("oneUpper")}</Text>
                  <Text style={styles.passwordRule}>• {passwordChecks.number ? "✓" : "○"} {t("oneNumber")}</Text>
                </View>
              )}
            </View>

            {/* CONFIRMAR CONTRASEÑA */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("confirmPassword")}</Text>

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
                  placeholder={t("repeatPassword")}
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
                  {t("legalText")}
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowTerms(true)}>
                <Text style={styles.legalLink}>{t("readFullInfo")}</Text>
              </Pressable>
            </View>
            <Modal visible={showTerms} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {t("beforeAccount")}
                  </Text>
                  <ScrollView style={styles.modalScroll}>
                    <Text style={styles.modalText}>
                      {t("termsAndPrivacy")}\n\nLa información
                      inmobiliaria es referencial y debe verificarse con un
                      asesor. Te comprometes a proporcionar datos
                      veraces.\n\nAVISO DE PRIVACIDAD\n\nTus datos se utilizarán
                      para gestionar tu cuenta y contactarte sobre propiedades y
                      servicios de EYESITE.\n\nTRATAMIENTO DE DATOS\n\nAutorizas
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
                      {t("acceptTerms")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowTerms(false)}
                    style={styles.closeTerms}
                  >
                    <Text style={styles.closeTermsText}>{t("close")}</Text>
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

                  <Text style={styles.buttonText}>{t("creatingAccount")}</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>{t("signUp")}</Text>
              )}
            </TouchableOpacity>

            {/* LOGIN */}
            <View style={styles.footerContainer}>
              <Text style={styles.footer}>{t("alreadyAccount")} </Text>

              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={styles.link}>{t("signIn")}</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      )}
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  confirmationScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmationCard: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#C9A84C",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
  },
  confirmationTitle: {
    color: "#C9A84C",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  confirmationText: {
    color: "#E5E5E5",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  confirmationEmail: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  confirmationHint: {
    color: "#AFAFAF",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },

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

  desktopContainer: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
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

  passwordGuide: { marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: "#141414", borderWidth: 1, borderColor: "#292929" },
  passwordGuideHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  passwordGuideTitle: { color: "#C9A84C", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  passwordGuideScore: { color: "#777", fontSize: 9, fontWeight: "800" },
  passwordBarTrack: { height: 3, backgroundColor: "#292929", borderRadius: 3, overflow: "hidden", marginVertical: 9 },
  passwordBar: { height: 3, backgroundColor: "#C9A84C", borderRadius: 3 },
  passwordRule: { color: "#8F8F8F", fontSize: 10, lineHeight: 17 },

  optional: { color: "#777", fontWeight: "400" },

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
