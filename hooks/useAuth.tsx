import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthProfile {
  id: string;
  email?: string | null;
  nombre?: string | null;
  telefono?: string | null;
  ciudad?: string | null;
  presupuesto?: string | null;
  estado?: string | null;
  status?: string | null;
  role?: string | null;
  terminos_aceptados?: boolean | null;
  terminos_version?: string | null;
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
        .select('id, email, role, nombre, telefono, ciudad, presupuesto, estado, terminos_aceptados, terminos_version')
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
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let subscribedUid: string | null = null;

    const closeProfileChannel = async () => {
      if (!profileChannel) return;
      const channel = profileChannel;
      profileChannel = null;
      subscribedUid = null;
      await supabase.removeChannel(channel);
    };

    const ensureProfileChannel = (uid: string) => {
      if (!mounted || subscribedUid === uid && profileChannel) return;

      if (profileChannel) {
        void supabase.removeChannel(profileChannel);
        profileChannel = null;
      }

      subscribedUid = uid;

      // Register the postgres_changes handler BEFORE subscribe().
      // Supabase rejects adding a callback after a channel has joined.
      profileChannel = supabase
        .channel(`profile-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${uid}`,
          },
          () => {
            void loadProfile(uid);
          },
        )
        .subscribe((status) => {
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (mounted && subscribedUid === uid) {
              // Keep the profile usable even when Realtime is temporarily unavailable.
              void loadProfile(uid);
            }
          }
        });
    };

    const applySession = (nextSession: Session | null, markReady = false) => {
      if (!mounted) return;

      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser?.id) {
        void closeProfileChannel();
        setProfile(null);
        setEstado(null);
        if (markReady) setLoading(false);
        return;
      }

      // Do not await here. getSession() and onAuthStateChange() can fire
      // almost simultaneously during startup. Keeping one channel per UID
      // prevents the "callback after subscribe()" Realtime race.
      ensureProfileChannel(nextUser.id);

      void loadProfile(nextUser.id).finally(() => {
        if (mounted && markReady) setLoading(false);
      });
    };

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      applySession(currentSession, true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      applySession(nextSession, true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      void closeProfileChannel();
    };
  }, [loadProfile]);

  return { user, session, profile, estado, loading };
}