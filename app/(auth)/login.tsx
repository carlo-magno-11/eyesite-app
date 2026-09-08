import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import AuthBackground from '@/components/AuthBackground';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      return Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      if (/rate limit|too many|hourly/i.test(error.message)) {
        return Alert.alert(
          'Espera 1 hora',
          'Supabase detectó demasiados intentos. Intenta de nuevo en 1 hora.'
        );
      }
      return Alert.alert('No se pudo iniciar sesión', error.message);
    }
    // No redirigimos manualmente: AuthGate decide según términos / estado del perfil.
  };

  return (
    <AuthBackground>
      <View style={styles.container}>
        <Text style={styles.brand}>EYESI+E</Text>
      <Text style={styles.subtitle}>Inicia sesión para ver tus propiedades</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Correo electrónico"
        placeholderTextColor="#6A6A6A"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        style={styles.input}
      />

      <View style={styles.passwordWrap}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor="#6A6A6A"
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={8}
          style={styles.eyeButton}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#9A9A9A"
          />
        </Pressable>
      </View>

      <TouchableOpacity
        onPress={login}
        disabled={loading}
        style={[styles.button, loading && { opacity: 0.7 }]}
      >
        {loading ? (
          <ActivityIndicator color="#0E0E0E" />
        ) : (
          <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        ¿No tienes cuenta?{' '}
        <Link href="/(auth)/register" style={styles.link}>
          Crear cuenta
        </Link>
      </Text>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  brand: { color: '#C9A84C', fontSize: 30, fontWeight: '900', marginBottom: 6 },
  subtitle: { color: '#9A9A9A', fontSize: 14, marginBottom: 24 },
  input: {
    backgroundColor: '#1A1A1A',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  passwordInput: { flex: 1, color: 'white', paddingVertical: 14 },
  eyeButton: { paddingLeft: 8 },
  button: {
    backgroundColor: '#C9A84C',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: { color: '#0E0E0E', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  footer: { color: '#8A8A8A', textAlign: 'center', fontSize: 13 },
  link: { color: '#C9A84C', fontWeight: '700' },
});