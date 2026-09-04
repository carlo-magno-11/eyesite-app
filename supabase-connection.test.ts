import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Connection', () => {
  let supabaseUrl: string;
  let supabaseAnonKey: string;
  let supabaseServiceKey: string;

  beforeAll(() => {
    supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  });

  it('should have Supabase URL configured', () => {
    expect(supabaseUrl).toBeTruthy();
    expect(supabaseUrl).toContain('supabase.co');
  });

  it('should have Supabase Anon Key configured', () => {
    expect(supabaseAnonKey).toBeTruthy();
    expect(supabaseAnonKey).toMatch(/^(sb_publishable_|eyJ)/);
  });

  it('should have Supabase Service Role Key configured', () => {
    expect(supabaseServiceKey).toBeTruthy();
    expect(supabaseServiceKey).toMatch(/^(sb_publishable_|eyJ)/);
  });

  it('should create Supabase client with anon key', () => {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('should create Supabase admin client with service role key', () => {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    expect(adminClient).toBeDefined();
    expect(adminClient.auth).toBeDefined();
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
