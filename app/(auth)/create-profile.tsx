import { useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const guardar = async () => {
    if (saving) return;
    if (!nombre.trim()) {
      return Alert.alert('Campos requeridos', 'El nombre es obligatorio.');
    }
    if (!telefono.trim()) {
      return Alert.alert('Campos requeridos', 'Agrega tu teléfono para que un asesor te contacte.');
    }
    if (!ciudad.trim()) {
      return Alert.alert('Campos requeridos', 'Ingresa tu ciudad o zona de interés.');
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return Alert.alert('Sesión no encontrada', 'Vuelve a iniciar sesión y completa tu perfil.');
      }

      // Columnas REALES de profiles (verificadas contra Supabase): nombre, full_name,
      // telefono, ciudad, presupuesto, estado, status, role.
      const payload = {
        nombre: nombre.trim(),
        full_name: nombre.trim(),
        telefono: telefono.trim(),
        ciudad: ciudad.trim(),
        presupuesto: presupuesto.trim() || null,
        estado: 'pendiente',
        status: 'pendiente',
        role: 'cliente',
      };

      const { error, count } = await supabase.from('profiles').update(payload).eq('id', user.id);

      // Si aún no existe la fila del perfil (sin trigger de creación), se inserta.
      if (error || (count !== null && count === 0)) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, email: user.email ?? null, ...payload });
        if (insertError) {
          console.error('[create-profile] insert falló:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
          });
          return Alert.alert('Error al guardar el perfil', insertError.message);
        }
      }

      router.replace('/terms' as never);
    } catch (e: any) {
      console.error('[create-profile] excepción:', e);
      Alert.alert('Error inesperado', e?.message ?? 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>COMPLETA TU PERFIL</Text>
          <Text style={styles.subtitle}>
            Estos datos ayudan a nuestros asesores a mostrarte las mejores opciones.
          </Text>

          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre completo"
            placeholderTextColor="#6A6A6A"
            autoCapitalize="words"
            style={styles.input}
          />

          <TextInput
            value={telefono}
            onChangeText={setTelefono}
            placeholder="Teléfono (WhatsApp)"
            placeholderTextColor="#6A6A6A"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TextInput
            value={ciudad}
            onChangeText={setCiudad}
            placeholder="Ciudad / Zona de interés"
            placeholderTextColor="#6A6A6A"
            autoCapitalize="words"
            style={styles.input}
          />

          <TextInput
            value={presupuesto}
            onChangeText={setPresupuesto}
            placeholder="Presupuesto (opcional, ej. $2,000,000)"
            placeholderTextColor="#6A6A6A"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />

          <TouchableOpacity
            onPress={guardar}
            disabled={saving}
            style={[styles.button, saving && { opacity: 0.7 }]}
          >
            {saving ? (
              <ActivityIndicator color="#0E0E0E" />
            ) : (
              <Text style={styles.buttonText}>GUARDAR Y CONTINUAR</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Tu cuenta quedará en revisión. Nosotros la activamos lo antes posible.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { color: '#C9A84C', fontSize: 26, fontWeight: '900', marginBottom: 6 },
  subtitle: { color: '#9A9A9A', fontSize: 13, marginBottom: 24, lineHeight: 19 },
  input: {
    backgroundColor: '#1A1A1A',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#C9A84C',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: { color: '#0E0E0E', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  hint: { color: '#8A8A8A', textAlign: 'center', fontSize: 12 },
});