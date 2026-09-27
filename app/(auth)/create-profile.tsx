import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import AuthBackground from '@/components/AuthBackground';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/lib/i18n';

export default function CreateProfileScreen() {
  const router = useRouter();
  const { isDesktop, horizontalPadding, contentMaxWidth } = useResponsive();
  const { t } = useI18n();

  const [step, setStep] = useState<1 | 2>(1);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user?.user_metadata) return;
      const metadata = data.user.user_metadata as Record<string, unknown>;
      setNombre(typeof metadata.nombre === 'string' ? metadata.nombre : '');
      setTelefono(typeof metadata.telefono === 'string' ? metadata.telefono : '');
      setCiudad(typeof metadata.ciudad === 'string' ? metadata.ciudad : '');
      setPresupuesto(typeof metadata.presupuesto === 'string' ? metadata.presupuesto : '');
    });

    return () => {
      mounted = false;
    };
  }, []);

  const goNext = () => {
    if (saving) return;

    const nombreLimpio = nombre.trim();
    const telefonoSoloNumeros = telefono.trim().replace(/\D/g, '');

    if (!nombreLimpio) {
      Alert.alert(t("missingInfo"), t("enterName"));
      return;
    }

    setStep(2);
  };

  const guardarPerfil = async () => {
    if (saving) return;

    const nombreLimpio = nombre.trim();
    const telefonoSoloNumeros = telefono.trim().replace(/\D/g, '');
    const ciudadLimpia = ciudad.trim();
    const presupuestoLimpio = presupuesto.trim();

    if (!nombreLimpio) {
      setStep(1);
      Alert.alert(t("missingInfo"), t("enterName"));
      return;
    }


    const presupuestoNumero = presupuestoLimpio
      ? Number(presupuestoLimpio.replace(/[^0-9.]/g, ''))
      : null;

    if (presupuestoNumero !== null && !Number.isFinite(presupuestoNumero)) {
      Alert.alert(t("missingInfo"), "Ingresa un presupuesto válido o déjalo vacío.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert(t("sessionUnavailable"), t("sessionUnavailableDescription"));
        router.replace('/(auth)/login' as never);
        return;
      }

      const payload = {
        id: user.id,
        email: user.email ?? null,
        nombre: nombreLimpio,
        telefono: telefonoSoloNumeros || null,
        ciudad: ciudadLimpia || null,
        presupuesto: presupuestoNumero,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (profileError) {
        console.error('[create-profile] save failed:', profileError);
        Alert.alert(t("saveFailed"), profileError.message || t("saveFailedDescription"));
        return;
      }

      router.replace('/terms');
    } catch (error: any) {
      console.error('[create-profile] unexpected error:', error);
      Alert.alert(
        t("profileError"),
        error?.message || t("profileErrorDescription"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, isDesktop && { maxWidth: contentMaxWidth ?? 620 }]}>
            <View style={styles.progress}>
              <View style={[styles.progressSegment, step >= 1 && styles.progressActive]} />
              <View style={[styles.progressSegment, step >= 2 && styles.progressActive]} />
            </View>

            <View style={styles.header}>
              <Text style={styles.step}>{step === 1 ? t("step1of2") : t("step2of2")}</Text>
              <Text style={styles.title}>
                {step === 1 ? t("profileStep1Title") : t("profileStep2Title")}
              </Text>
              <Text style={styles.subtitle}>
                {step === 1 ? t("profileStep1Subtitle") : t("profileStep2Subtitle")}
              </Text>
            </View>

            {step === 1 ? (
              <View style={styles.form}>
                <Text style={styles.label}>{t("fullName")}</Text>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder={t("fullNamePlaceholder")}
                  placeholderTextColor="#777"
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  autoComplete="name"
                  style={styles.input}
                  editable={!saving}
                  returnKeyType="next"
                />

                <Text style={styles.label}>{t("phoneWhatsapp")} <Text style={styles.optional}>({t("optional")})</Text></Text>
                <TextInput
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder={t("phonePlaceholder")}
                  placeholderTextColor="#777"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  style={styles.input}
                  editable={!saving}
                  returnKeyType="done"
                  onSubmitEditing={goNext}
                />

                <TouchableOpacity
                  style={[styles.button, saving && styles.buttonDisabled]}
                  onPress={goNext}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>{t("saveContinue")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.label}>{t("cityZone")} <Text style={styles.optional}>({t("optional")})</Text></Text>
                <TextInput
                  value={ciudad}
                  onChangeText={setCiudad}
                  placeholder={t("cityPlaceholder")}
                  placeholderTextColor="#777"
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.input}
                  editable={!saving}
                  returnKeyType="next"
                />

                <Text style={styles.label}>
                  {t("budgetOptional")}
                  <Text style={styles.optional}> ({t("optional")})</Text>
                </Text>
                <TextInput
                  value={presupuesto}
                  onChangeText={setPresupuesto}
                  placeholder={t("budgetPlaceholder")}
                  placeholderTextColor="#777"
                  keyboardType="decimal-pad"
                  style={styles.input}
                  editable={!saving}
                  returnKeyType="done"
                  onSubmitEditing={guardarPerfil}
                />

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => setStep(1)}
                    disabled={saving}
                    style={styles.backButton}
                  >
                    <Text style={styles.backButtonText}>{t("profileBack")}</Text>
                  </Pressable>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonFlex, saving && styles.buttonDisabled]}
                    onPress={guardarPerfil}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <Text style={styles.buttonText}>{t("saveContinue")}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t("underReview")}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressActive: {
    backgroundColor: '#C9A84C',
  },
  header: {
    marginBottom: 28,
  },
  step: {
    color: '#C9A84C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  subtitle: {
    color: '#9A9A9A',
    fontSize: 15,
    lineHeight: 22,
  },
  form: { width: '100%' },
  label: {
    color: '#BDBDBD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 18,
  },
  optional: { fontWeight: '400', opacity: 0.6 },
  input: {
    width: '100%',
    minHeight: 54,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 30,
  },
  backButton: {
    minHeight: 54,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  backButtonText: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  button: {
    minHeight: 54,
    marginTop: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  buttonFlex: {
    flex: 1,
    marginTop: 0,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#000000',
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerText: {
    color: '#9A9A9A',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});
