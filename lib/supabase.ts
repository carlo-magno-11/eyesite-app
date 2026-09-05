import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodnB2cHZ0a2Rnbm54ZHdkcmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODk5MTEsImV4cCI6MjEwMjY2NTkxMX0.zsEMmjhbln24S25FnbKvlkic2djzON8QoXNLO8CtXA0';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan variables EXPO_PUBLIC_SUPABASE_URL / ANON_KEY en .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
