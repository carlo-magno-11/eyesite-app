import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthProfile {
  id: string;
  email?: string | null;
  nombre?: string | null;
  telefono?: string | null;
  estado?: string | null;
  status?: string | null;
  role?: string | null;
  [key: string]: any;
}

/**
 * Hook ÚNICO de autenticación (Supabase onAuthStateChange).
 * Centraliza getSession + suscripción para NO repetir getSession en cada pantalla.
 * Expone: user, session, profile, estado (del perfil), loading.
 *
 * Nota over FS: coexiste con hooks/use-auth.ts (template legacy); este es el de Supabase.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    try {
      // Solo columnas REALES de profiles (sondeo /tmp/schema_real.txt):
      // id, email, role, nombre, telefono, estado, terminos_aceptados, terminos_fecha
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, nombre, telefono, estado')
        .eq('id', uid)
        .maybeSingle();
      if (error) {
        console.error('[useAuth] loadProfile error:', {
          code: error.code, message: error.message, details: error.details,
        });
        return;
      }
      setProfile((data as AuthProfile) ?? null);
      setEstado((data?.estado ?? null) as string | null);
    } catch (e) {
      console.warn('[useAuth] loadProfile excepción:', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user?.id) {
        // Esperar al perfil para que AuthGate no redirija con datos incompletos (anti-flash).
        await loadProfile(s.user.id);
      }
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user?.id) {
        await loadProfile(s.user.id);
      } else {
        setProfile(null);
        setEstado(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  return { user, session, profile, estado, loading };
}