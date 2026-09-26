import { useEffect, useState } from 'react';
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

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  estado: string | null;
  loading: boolean;
};

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  estado: null,
  loading: true,
};

// useAuth() is consumed by several screens at the same time. Keep one
// Supabase auth lifecycle and one profile Realtime channel for the whole app.
// Multiple hook instances subscribe to this shared state instead of creating
// duplicate auth listeners/channels during navigation and startup.
let authState = initialState;
const authListeners = new Set<() => void>();
let authRuntimeStarted = false;
let authSubscription: { unsubscribe: () => void } | null = null;
let profileChannel: ReturnType<typeof supabase.channel> | null = null;
let subscribedUid: string | null = null;
let profileChannelGeneration = 0;
let profileLoadGeneration = 0;

function emitAuthState() {
  for (const listener of authListeners) listener();
}

function setAuthState(patch: Partial<AuthState>) {
  authState = { ...authState, ...patch };
  emitAuthState();
}

async function closeProfileChannel() {
  if (!profileChannel) return;
  const channel = profileChannel;
  profileChannel = null;
  subscribedUid = null;
  await supabase.removeChannel(channel);
}

async function loadProfile(uid: string, expectedGeneration?: number) {
  const loadGeneration = expectedGeneration ?? ++profileLoadGeneration;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, nombre, telefono, ciudad, presupuesto, estado, terminos_aceptados, terminos_version')
      .eq('id', uid)
      .maybeSingle();

    if (loadGeneration !== profileLoadGeneration || authState.user?.id !== uid) return;

    if (error) {
      console.error('[useAuth] loadProfile error:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      setAuthState({ profile: null, estado: null });
      return;
    }

    setAuthState({
      profile: (data as AuthProfile) ?? null,
      estado: (data?.estado ?? null) as string | null,
    });
  } catch (error) {
    if (loadGeneration !== profileLoadGeneration || authState.user?.id !== uid) return;
    console.warn('[useAuth] loadProfile excepción:', error);
    setAuthState({ profile: null, estado: null });
  }
}

function ensureProfileChannel(uid: string) {
  if (subscribedUid === uid && profileChannel) return;

  if (profileChannel) {
    void closeProfileChannel();
  }

  subscribedUid = uid;
  const channelId = ++profileChannelGeneration;

  // Register postgres_changes BEFORE subscribe(). There must be no second
  // .on() call after the channel has joined.
  profileChannel = supabase
    .channel(`profile-${uid}-${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${uid}`,
      },
      () => {
        void loadProfile(uid);
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (subscribedUid === uid) void loadProfile(uid);
      }
    });
}

function applySession(nextSession: Session | null) {
  const nextUser = nextSession?.user ?? null;

  if (!nextUser?.id) {
    void closeProfileChannel();
    setAuthState({
      session: nextSession,
      user: null,
      profile: null,
      estado: null,
      loading: false,
    });
    return;
  }

  const transitionGeneration = ++profileLoadGeneration;
  setAuthState({
    session: nextSession,
    user: nextUser,
    profile: null,
    estado: null,
    loading: true,
  });

  ensureProfileChannel(nextUser.id);
  void loadProfile(nextUser.id, transitionGeneration).finally(() => {
    if (profileLoadGeneration === transitionGeneration && authState.user?.id === nextUser.id) {
      setAuthState({ loading: false });
    }
  });
}

function startAuthRuntime() {
  if (authRuntimeStarted) return;
  authRuntimeStarted = true;

  // Register the auth listener once for the whole JS runtime.
  const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    applySession(nextSession);
  });
  authSubscription = data.subscription;

  void supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('[useAuth] getSession error:', error);
      setAuthState({ loading: false });
      return;
    }
    applySession(session);
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(authState);

  useEffect(() => {
    startAuthRuntime();

    const listener = () => setState(authState);
    authListeners.add(listener);
    setState(authState);

    return () => {
      authListeners.delete(listener);
    };
  }, []);

  return state;
}

// Kept for module lifecycle diagnostics and future hot-reload cleanup.
// Normal app unmounts must not tear down the shared auth runtime because
// another mounted screen may still be consuming useAuth().
export function __resetAuthRuntimeForTests() {
  authSubscription?.unsubscribe();
  authSubscription = null;
  void closeProfileChannel();
  authRuntimeStarted = false;
  authState = initialState;
  authListeners.clear();
}
