import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

export type Language = "es" | "en";

const STORAGE_KEY = "@eyesite/language";
const DEFAULT_LANGUAGE: Language = "es";

const dictionaries = {
  es: {
    language: "Idioma",
    spanish: "Español",
    english: "English",
    languageDescription: "Selecciona el idioma de EYESITE.",
    languageSaved: "Idioma actualizado.",
    settings: "CONFIGURACIÓN",
    back: "‹ Volver",
    account: "Cuenta",
    privacy: "Aviso de privacidad",
    terms: "Términos y condiciones",
    logout: "CERRAR SESIÓN",
    emailManaged: "El correo se administra desde Supabase Auth y no se modifica desde esta pantalla.",
    home: "Inicio",
    map: "Mapa",
    publish: "Publicar",
    favorites: "Favoritos",
    about: "Nosotros",
    login: "Iniciar sesión",
    createAccount: "Crear cuenta",
    welcome: "BIENVENIDO",
    discover: "Inicia sesión para descubrir propiedades seleccionadas para ti.",
    email: "CORREO ELECTRÓNICO",
    password: "CONTRASEÑA",
    forgotPassword: "¿Olvidaste tu contraseña?",
    requiredFields: "Campos requeridos",
    enterCredentials: "Ingresa tu correo electrónico y contraseña.",
    invalidEmail: "Correo inválido",
    validEmail: "Ingresa un correo electrónico válido.",
    signInError: "No se pudo iniciar sesión",
    unexpectedError: "Error inesperado",
    tryAgain: "Ocurrió un problema. Inténtalo nuevamente.",
    tooManyAttempts: "Demasiados intentos",
    tooManyAttemptsDescription: "Supabase detectó demasiados intentos de inicio de sesión. Espera un momento antes de volver a intentarlo.",
    incorrectCredentials: "Datos incorrectos",
    incorrectCredentialsDescription: "El correo o la contraseña no son correctos.",
    emailNotConfirmed: "Correo sin confirmar",
    emailNotConfirmedDescription: "Confirma tu correo electrónico antes de iniciar sesión.",
    signInFailedDescription: "Ocurrió un problema al iniciar sesión. Inténtalo nuevamente.",
    unexpectedSignInDescription: "No fue posible iniciar sesión. Inténtalo nuevamente.",
    signingIn: "INICIANDO SESIÓN...",
    signIn: "INICIAR SESIÓN",
    passwordPlaceholder: "Tu contraseña",
    noAccount: "¿Todavía no tienes una cuenta?",
    createAccountUpper: "CREAR CUENTA",
    protectedData: "Tus datos están protegidos.",
    mapTitle: "TERRENOS EYESITE CERCA DE TI",
    mapNearby: "oportunidades en Yucatán",
    mapLocated: "propiedades con ubicación",
    mapHint: "Explora Yucatán libremente: acerca, aleja y mueve el mapa para buscar.",
    mapLocationPermission: "Permiso de ubicación",
    mapLocationPermissionDescription: "Activa el permiso de ubicación para encontrar propiedades cercanas.",
    mapLocation: "Ubicación",
    mapLocationError: "No pudimos obtener tu ubicación. Puedes utilizar el mapa manualmente.",
    mapLoadError: "No se pudieron cargar las propiedades",
    mapNoLocated: "Aún no hay propiedades ubicadas",
    mapOnlyActive: "Solo aparecen propiedades EYESITE activas, publicadas por administración y con coordenadas válidas.",
    mapNearbyTitle: "Propiedades más cercanas",
    mapLocatedTitle: "Propiedades ubicadas",
    mapPublishedOnly: "Solo propiedades EYESITE publicadas y activas.",
    viewProperty: "Ver propiedad",
    kmFromYou: "de ti",
  },
  en: {
    language: "Language",
    spanish: "Español",
    english: "English",
    languageDescription: "Select the EYESITE language.",
    languageSaved: "Language updated.",
    settings: "SETTINGS",
    back: "‹ Back",
    account: "Account",
    privacy: "Privacy notice",
    terms: "Terms and conditions",
    logout: "SIGN OUT",
    emailManaged: "Your email is managed by Supabase Auth and cannot be changed from this screen.",
    home: "Home",
    map: "Map",
    publish: "Publish",
    favorites: "Favorites",
    about: "About us",
    login: "Sign in",
    createAccount: "Create account",
    welcome: "WELCOME",
    discover: "Sign in to discover properties selected for you.",
    email: "EMAIL",
    password: "PASSWORD",
    forgotPassword: "Forgot your password?",
    requiredFields: "Required fields",
    enterCredentials: "Enter your email and password.",
    invalidEmail: "Invalid email",
    validEmail: "Enter a valid email address.",
    signInError: "Could not sign in",
    unexpectedError: "Unexpected error",
    tryAgain: "Something went wrong. Please try again.",
    tooManyAttempts: "Too many attempts",
    tooManyAttemptsDescription: "Supabase detected too many sign-in attempts. Please wait a moment before trying again.",
    incorrectCredentials: "Incorrect credentials",
    incorrectCredentialsDescription: "The email or password is incorrect.",
    emailNotConfirmed: "Email not confirmed",
    emailNotConfirmedDescription: "Confirm your email address before signing in.",
    signInFailedDescription: "Something went wrong while signing in. Please try again.",
    unexpectedSignInDescription: "We could not sign you in. Please try again.",
    signingIn: "SIGNING IN...",
    signIn: "SIGN IN",
    passwordPlaceholder: "Your password",
    noAccount: "Don’t have an account yet?",
    createAccountUpper: "CREATE ACCOUNT",
    protectedData: "Your data is protected.",
    mapTitle: "EYESITE LAND NEAR YOU",
    mapNearby: "opportunities in Yucatán",
    mapLocated: "properties with location",
    mapHint: "Explore Yucatán freely: zoom in, zoom out and move the map to search.",
    mapLocationPermission: "Location permission",
    mapLocationPermissionDescription: "Enable location permission to find nearby properties.",
    mapLocation: "Location",
    mapLocationError: "We could not get your location. You can use the map manually.",
    mapLoadError: "Could not load properties",
    mapNoLocated: "There are no located properties yet",
    mapOnlyActive: "Only active EYESITE properties published by administration with valid coordinates appear.",
    mapNearbyTitle: "Nearest properties",
    mapLocatedTitle: "Located properties",
    mapPublishedOnly: "Only published and active EYESITE properties.",
    viewProperty: "View property",
    kmFromYou: "from you",
  },
} as const;

export type TranslationKey = keyof typeof dictionaries.es;

function detectLanguage(): Language {
  try {
    const locale =
      Platform.OS === "web"
        ? typeof navigator !== "undefined"
          ? navigator.language
          : ""
        : Intl.DateTimeFormat().resolvedOptions().locale;

    return /^en(?:-|$)/i.test(locale) ? "en" : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export async function loadLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch {}
  return detectLanguage();
}

export async function saveLanguage(language: Language) {
  await AsyncStorage.setItem(STORAGE_KEY, language);
}

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage());

  useEffect(() => {
    void loadLanguage().then(setLanguageState);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: async (next) => {
        await saveLanguage(next);
        setLanguageState(next);
      },
      t: (key) => dictionaries[language][key],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
