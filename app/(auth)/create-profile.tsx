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

export default function CreateProfileScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [saving, setSaving] = useState(false);

  const guardarPerfil = async () => {
    if (saving) return;

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const ciudadLimpia = ciudad.trim();
    const presupuestoLimpio = presupuesto.trim();

    if (!nombreLimpio) {
      Alert.alert('Falta información', 'Escribe tu nombre completo.');
      return;
    }

    const telefonoSoloNumeros = telefonoLimpio.replace(/\D/g, '');

    if (telefonoSoloNumeros.length < 10) {
      Alert.alert(
        'Teléfono inválido',
        'Escribe un número de teléfono válido de al menos 10 dígitos.'
      );
      return;
    }

    if (!ciudadLimpia) {
      Alert.alert('Falta información', 'Escribe tu ciudad o zona.');
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
          'Sesión no disponible',
          'Tu sesión no está disponible. Vuelve a iniciar sesión.'
        );

        router.replace('/(auth)/login' as never);
        return;
      }

      /*
       * Perfil inicial.
       *
       * estado = pendiente significa que el usuario
       * todavía NO tiene autorización para entrar.
       *
       * El administrador será quien cambie:
       *
       * pendiente -> aprobado
       */
      const payload = {
        id: user.id,
        email: user.email ?? null,
        nombre: nombreLimpio,
        telefono: telefonoSoloNumeros,
        estado: 'pendiente',
        role: 'user',
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
          'No se pudo guardar',
          profileError.message ||
            'Ocurrió un error al guardar tu información.'
        );

        return;
      }

      /*
       * El perfil quedó guardado como PENDIENTE.
       *
       * Continuamos al segundo paso del proceso.
       */
      router.replace('/terms');
    } catch (error: any) {
      console.error('Error en create-profile:', error);

      Alert.alert(
        'Error',
        error?.message ||
          'Ocurrió un error inesperado. Intenta nuevamente.'
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
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.step}>PASO 1 DE 2</Text>

            <Text style={styles.title}>
              COMPLETA TU PERFIL
            </Text>

            <Text style={styles.subtitle}>
              Necesitamos algunos datos para crear tu perfil.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>
              NOMBRE COMPLETO
            </Text>

            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre completo"
              placeholderTextColor="#777"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
              editable={!saving}
            />

            <Text style={styles.label}>
              TELÉFONO / WHATSAPP
            </Text>

            <TextInput
              value={telefono}
              onChangeText={setTelefono}
              placeholder="10 dígitos"
              placeholderTextColor="#777"
              keyboardType="phone-pad"
              style={styles.input}
              editable={!saving}
            />

            <Text style={styles.label}>
              CIUDAD / ZONA
            </Text>

            <TextInput
              value={ciudad}
              onChangeText={setCiudad}
              placeholder="Ciudad o zona de interés"
              placeholderTextColor="#777"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
              editable={!saving}
            />

            <Text style={styles.label}>
              PRESUPUESTO
              <Text style={styles.optional}> (OPCIONAL)</Text>
            </Text>

            <TextInput
              value={presupuesto}
              onChangeText={setPresupuesto}
              placeholder="Ej. $2,500,000"
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
                  ? 'GUARDANDO...'
                  : 'GUARDAR Y CONTINUAR'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Tu cuenta permanecerá bajo revisión antes de ser
              activada.
            </Text>
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