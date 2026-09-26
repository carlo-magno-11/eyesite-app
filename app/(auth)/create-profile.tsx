import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [presupuesto, setPresupuesto] = useState('');

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user?.user_metadata) return;
      const metadata = data.user.user_metadata as Record<string, unknown>;
      setNombre((metadata.nombre as string) || '');
      setTelefono((metadata.telefono as string) || '');
      setCiudad((metadata.ciudad as string) || '');
      setPresupuesto((metadata.presupuesto as string) || '');
    });
    return () => { mounted = false; };
  }, []);
  const [saving, setSaving] = useState(false);

  const guardarPerfil = async () => {
    if (saving) return;

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const ciudadLimpia = ciudad.trim();
    const presupuestoLimpio = presupuesto.trim();

    if (!nombreLimpio) {
      Alert.alert(t("missingInfo"), t("enterName"));
      return;
    }

    const telefonoSoloNumeros = telefonoLimpio.replace(/\D/g, '');

    if (telefonoSoloNumeros.length < 10) {
      Alert.alert(
        t("invalidPhone"),
        t("validPhone")
      );
      return;
    }

    if (!ciudadLimpia) {
      Alert.alert(t("missingInfo"), t("enterCityShort"));
      return;
    }

    setSaving(true);

    try {
      /*
       * Obtenemos al usuario actualmente autenticado.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error obteniendo usuario:', userError);
        throw userError;
      }

      if (!user) {
        Alert.alert(
          t("sessionUnavailable"),
          t("sessionUnavailableDescription")
        );

        router.replace('/(auth)/login' as never);
        return;
      }

      /*
       * Perfil inicial.
       *
       * El estado y el rol no se modifican aquí.
       * La base de datos conserva la aprobación administrativa
       * si el perfil ya existe; en un perfil nuevo se aplican
       * los valores predeterminados del esquema.
       */
      const payload = {
        id: user.id,
        email: user.email ?? null,
        nombre: nombreLimpio,
        telefono: telefonoSoloNumeros,
        ciudad: ciudadLimpia,
        presupuesto: presupuestoLimpio ? Number(presupuestoLimpio.replace(/[^0-9.]/g, '')) || null : null,
      };

      /*
       * Upsert:
       *
       * - Si el perfil no existe, lo crea.
       * - Si ya existe, actualiza el perfil correspondiente
       *   al usuario autenticado.
       */
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(payload, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('Error guardando perfil:', profileError);

        Alert.alert(
          t("saveFailed"),
          profileError.message ||
            t("saveFailedDescription")
        );

        return;
      }

      /*
       * El perfil quedó guardado sin alterar su rol ni estado.
       *
       * Continuamos al segundo paso del proceso.
       */
      router.replace('/terms');
    } catch (error: any) {
      console.error('Error en create-profile:', error);

      Alert.alert(
        t("profileError"),
        error?.message ||
          t("profileErrorDescription")
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
          <View style={styles.header}>
            <Text style={styles.step}>{t("step1of2")}</Text>

            <Text style={styles.title}>
              {t("completeProfile")}
            </Text>

            <Text style={styles.subtitle}>
              {t("profileSubtitle")}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>
              {t("fullName")}
            </Text>

            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="{t("fullNamePlaceholder")}"
              placeholderTextColor="#777"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
              editable={!saving}
            />

            <Text style={styles.label}>
              {t("phoneWhatsapp")}
            </Text>

            <TextInput
              value={telefono}
              onChangeText={setTelefono}
              placeholder="{t("phonePlaceholder")}"
              placeholderTextColor="#777"
              keyboardType="phone-pad"
              style={styles.input}
              editable={!saving}
            />

            <Text style={styles.label}>
              {t("cityZone")}
            </Text>

            <TextInput
              value={ciudad}
              onChangeText={setCiudad}
              placeholder="{t("cityPlaceholder")}"
              placeholderTextColor="#777"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
              editable={!saving}
            />

            <Text style={styles.label}>
              {t("budgetOptional")}
              <Text style={styles.optional}> ({t("optional")})</Text>
            </Text>

            <TextInput
              value={presupuesto}
              onChangeText={setPresupuesto}
              placeholder="{t("budgetPlaceholder")}"
              placeholderTextColor="#777"
              keyboardType="default"
              style={styles.input}
              editable={!saving}
            />

            <TouchableOpacity
              style={[
                styles.button,
                saving && styles.buttonDisabled,
              ]}
              onPress={guardarPerfil}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {saving
                  ? '{t("saving")}'
                  : '{t("saveContinue")}'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t("underReview")}
            </Text>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },

  content: {
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    marginBottom: 30,
  },

  step: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
    opacity: 0.65,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.75,
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 18,
  },

  optional: {
    fontWeight: '400',
    opacity: 0.6,
  },

  input: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  button: {
    minHeight: 54,
    marginTop: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },

  buttonDisabled: {
    opacity: 0.55,
  },

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
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.55,
  },
});