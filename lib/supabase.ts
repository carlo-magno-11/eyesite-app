import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodnB2cHZ0a2Rnbm54ZHdkcmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODk5MTEsImV4cCI6MjEwMjY2NTkxMX0.zsEMmjhbln24S25FnbKvlkic2djzON8QoXNLO8CtXA0';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Faltan EXPO_PUBLIC_SUPABASE_URL / ANON_KEY en .env');
}

// Fix Expo web vs native: web usa localStorage, native AsyncStorage.
// Fix HMR: guarda en globalThis para NO duplicar el cliente en fast refresh
// (evita el warning "Multiple GoTrueClient instances detected").
declare global {
  // eslint-disable-next-line no-var
  var __eyesi_supabase__: SupabaseClient | undefined;
}

const getStorage = () => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  }
  return AsyncStorage;
};

export const supabase: SupabaseClient =
  globalThis.__eyesi_supabase__ ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: getStorage() as any,
      storageKey: 'eyesi-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (!globalThis.__eyesi_supabase__) {
  globalThis.__eyesi_supabase__ = supabase;
}
