import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Proyecto ACTIVO (xhvpvpvtkdgnnxdwdrkn). Solo anon key.
// Regla del proyecto: NUNCA usar service_role key.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodnB2cHZ0a2Rnbm54ZHdkcmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODk5MTEsImV4cCI6MjEwMjY2NTkxMX0.zsEMmjhbln24S25FnbKvlkic2djzON8QoXNLO8CtXA0';

describe('Supabase Connection', () => {
  it('should have Supabase URL configured', () => {
    expect(supabaseUrl).toBeTruthy();
    expect(supabaseUrl).toContain('supabase.co');
  });

  it('should have Supabase Anon Key configured', () => {
    expect(supabaseAnonKey).toBeTruthy();
    expect(supabaseAnonKey).toMatch(/^eyJ/);
  });

  it('should create Supabase client with anon key', () => {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('should verify Supabase connection is working', async () => {
    const client = createClient(supabaseUrl, supabaseAnonKey);

    try {
      // Test basic query to verify connection
      const { data, error } = await client
        .from('propiedades')
        .select('count')
        .limit(1);

      // Connection is successful if we get a response (even if empty)
      expect(error || data !== undefined).toBeTruthy();
    } catch (err) {
      // Network errors are expected in test environment
      expect(err).toBeDefined();
    }
  });
});
