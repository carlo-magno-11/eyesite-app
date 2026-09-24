import { useState } from 'react';
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
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import AuthBackground from '@/components/AuthBackground';
import { useResponsive } from '@/hooks/use-responsive';

export default function LoginScreen() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (loading) return;

    const emailLimpio = email.trim().toLowerCase();

    // -----------------------------
    // Validaciones
    // -----------------------------

    if (!emailLimpio || !password) {
      return Alert.alert(
        'Campos requeridos',
        'Ingresa tu correo electrónico y contraseña.'
      );
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio);

    if (!emailValido) {
      return Alert.alert(
        'Correo inválido',
        'Ingresa un correo electrónico válido.'
      );
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLimpio,
        password,
      });

      if (error) {
        console.error('[login] error:', {
          code: error.code,
          message: error.message,
          status: error.status,
        });

        if (/rate limit|too many|hourly/i.test(error.message)) {
          Alert.alert(
            'Demasiados intentos',
            'Supabase detectó demasiados intentos de inicio de sesión. Espera un momento antes de volver a intentarlo.'
          );
          return;
        }

        if (
          /invalid login credentials|invalid credentials/i.test(
            error.message
          )
        ) {
          Alert.alert(
            'Datos incorrectos',
            'El correo o la contraseña no son correctos.'
          );
          return;
        }

        if (/email not confirmed/i.test(error.message)) {
          Alert.alert(
            'Correo sin confirmar',
            'Confirma tu correo electrónico antes de iniciar sesión.'
          );
          return;
        }

        Alert.alert(
          'No se pudo iniciar sesión',
          'Ocurrió un problema al iniciar sesión. Inténtalo nuevamente.'
        );

        return;
      }

      // No hacemos navegación manual.
      // AuthGate determina el siguiente destino según:
      // - términos
      // - perfil
      // - estado de aprobación
    } catch (error: any) {
      console.error('[login] excepción:', error);

      Alert.alert(
        'Error inesperado',
        error?.message ||
          'No fue posible iniciar sesión. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <SafeKeyboard>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, isDesktop && styles.desktopContainer]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>E</Text>
              </View>

              <Text style={styles.brand}>EYESI+E</Text>

              <Text style={styles.title}>BIENVENIDO</Text>

              <Text style={styles.subtitle}>
                Inicia sesión para descubrir propiedades seleccionadas para ti.
              </Text>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>CORREO ELECTRÓNICO</Text>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color="#777"
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
                    textContentType="emailAddress"
                    returnKeyType="next"
                    editable={!loading}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>CONTRASEÑA</Text>

                  <Link href={"/forgot-password" as any} asChild>
                    <Pressable disabled={loading}>
                      <Text style={styles.forgotText}>
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </Pressable>
                  </Link>
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline" 
                    size={19}
                    color="#777"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={login}
                    editable={!loading}
                    style={styles.input}
                  />

                  <Pressable
                    onPress={() => setShowPassword((value) => !value)}
                    disabled={loading}
                    hitSlop={10}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={21}
                      color="#999"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Botón */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={login}
                disabled={loading}
                style={[
                  styles.button,
                  loading && styles.buttonDisabled,
                ]}
              >
                {loading ? (
                  <>
                    <ActivityIndicator
                      color="#0E0E0E"
                      size="small"
                    />
                    <Text style={styles.loadingText}>
                      INICIANDO SESIÓN...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      INICIAR SESIÓN
                    </Text>

                    <Text style={styles.arrow}>→</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Registro */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                ¿Todavía no tienes una cuenta?
              </Text>

              <Link href="/(auth)/register" asChild>
                <Pressable disabled={loading}>
                  <Text style={styles.registerLink}>
                    CREAR CUENTA
                  </Text>
                </Pressable>
              </Link>
            </View>

            {/* Seguridad */}
            <View style={styles.security}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color="#777"
              />

              <Text style={styles.securityText}>
                Tus datos están protegidos.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeKeyboard>
    </AuthBackground>
  );
}

/**
 * Mantiene el formulario visible cuando aparece el teclado.
 */
function SafeKeyboard({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
  },

  // -----------------------------
  // Header
  // -----------------------------

  desktopContainer: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 34,
  },

  logoMark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.35)',
    marginBottom: 13,
  },

  logoMarkText: {
    color: '#C9A84C',
    fontSize: 25,
    fontWeight: '900',
  },

  brand: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 24,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 8,
  },

  subtitle: {
    color: '#8F8F8F',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 330,
  },

  // -----------------------------
  // Form
  // -----------------------------

  form: {
    width: '100%',
  },

  field: {
    marginBottom: 19,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  label: {
    color: '#BDBDBD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  forgotText: {
    color: '#C9A84C',
    fontSize: 11,
    fontWeight: '700',
  },

  inputWrap: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 11,
  },

  inputIcon: {
    marginLeft: 15,
    marginRight: 3,
  },

  input: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 15,
  },

  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // -----------------------------
  // Button
  // -----------------------------

  button: {
    minHeight: 56,
    marginTop: 4,
    backgroundColor: '#C9A84C',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',

    shadowColor: '#C9A84C',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: '#0E0E0E',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },

  arrow: {
    color: '#0E0E0E',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 10,
    marginTop: -2,
  },

  loadingText: {
    color: '#0E0E0E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 9,
  },

  // -----------------------------
  // Registro
  // -----------------------------

  registerContainer: {
    alignItems: 'center',
    marginTop: 28,
  },

  registerText: {
    color: '#777',
    fontSize: 12,
    marginBottom: 7,
  },

  registerLink: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // -----------------------------
  // Seguridad
  // -----------------------------

  security: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },

  securityText: {
    color: '#666',
    fontSize: 10,
    marginLeft: 5,
  },
});