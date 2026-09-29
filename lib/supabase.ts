import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';

const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_lrWXjCHfxJdwBRo7jeGYFg_BKRooUR-';

if (!supabaseUrl || !supabaseKey) {
  console.error('[supabase] Faltan EXPO_PUBLIC_SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY en .env');
}

// Fix Expo web vs native: web usa localStorage, native AsyncStorage.
// Fix HMR: guarda en globalThis para NO duplicar el cliente en fast refresh
// (evita el warning "Multiple GoTrueClient instances detected").
declare global {
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
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: getStorage() as any,
      storageKey: 'eyesi-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

if (!globalThis.__eyesi_supabase__) {
  globalThis.__eyesi_supabase__ = supabase;
}
