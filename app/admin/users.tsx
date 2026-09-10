import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

interface ProfileRow {
  id: string;
  email?: string | null;
  nombre?: string | null;
  full_name?: string | null;
  telefono?: string | null;
  phone?: string | null;
  estado?: string | null;
  status?: string | null;
  created_at?: string | null;
}

const TABS = ['todos', 'pendiente', 'activa', 'denegado'] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZE = 100;

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState<Tab>('todos');

  const estadoUI = useCallback((p: ProfileRow): string => {
    return ((p.estado ?? p.status ?? 'pendiente') as string).toLowerCase();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[users] fetching as', user?.email, 'uid:', user?.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      console.log('[users] result count:', data?.length, 'error:', error);
      if (error) {
        setErrorMsg(error.message);
        console.error('[users] fetch falló:', {
          code: error.code, message: error.message, details: error.details, hint: error.hint,
        });
        return;
      }
      setProfiles(data || []);
      setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    } catch (e: any) {
      console.error('[users] crash', e);
      setErrorMsg(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[users] fetching as', user?.email, 'uid:', user?.id);
      const from = p * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
        .range(from, to);
      console.log('[users] result count:', data?.length, 'error:', error);

      if (error) {
        // 42703/PGRST204 = falta la migración 20250517_profiles_admin_terms.sql
        setErrorMsg(error.message);
        console.error('[users] fetch falló:', {
          code: error.code, message: error.message, details: error.details, hint: error.hint,
        });
        Alert.alert('Error', error.message);
        return;
      }
      setProfiles((prev) => (append ? [...prev, ...(data as ProfileRow[])] : (data as ProfileRow[])));
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    } catch (e: any) {
      console.error('[users] ERROR REAL:', {
        code: e?.code, message: e?.message, details: e?.details, hint: e?.hint,
      });
      setErrorMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setProfiles([]);
    setPage(0);
    fetchPage(0, false);
  }, [fetchPage]);

  // Realtime: un usuario nuevo/actualizado aparece sin F5 (página inicial).
  useRealtimeTable('profiles', () => {
    console.log('[realtime] profiles changed -> refetch');
    setProfiles([]);
    setPage(0);
    fetchUsers();
  });

  const filtered = useMemo(
    () => profiles.filter((p) => tab === 'todos' || estadoUI(p) === tab),
    [profiles, tab, estadoUI]
  );

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  const updateEstado = async (profile: ProfileRow, nuevo: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ estado: nuevo }).eq('id', profile.id);
      if (error) {
        console.error('ADMIN_UPDATE_FAIL', error.code, error.message, error.details, error.hint);
        Alert.alert('Error', `${error.message}${error.details ? ' — ' + error.details : ''}`);
        return;
      }
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, estado: nuevo, status: nuevo } : p))
      );
    } catch (e: any) {
      console.error('ADMIN_UPDATE_FAIL', e?.code, e?.message, e?.details, e?.hint);
      Alert.alert('Error', e?.message || 'No se pudo actualizar');
    }
  };

  if (loading && profiles.length === 0) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
        <View style={styles.center}>
          <ActivityIndicator color="#C9A84C" size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>USUARIOS</Text>
        <Text style={styles.headerSub}>{profiles.length} usuarios cargados</Text>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ Error: {errorMsg}</Text>
          </View>
        )}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filtered.map((p) => (
          <UserCard key={p.id} profile={p} estadoUI={estadoUI(p)} onUpdate={updateEstado} />
        ))}

        {hasMore && (
          <Pressable onPress={loadMore} style={styles.loadMore}>
            <Text style={styles.loadMoreText}>CARGAR MÁS</Text>
          </Pressable>
        )}
        {!hasMore && profiles.length > 0 && (
          <Text style={styles.endText}>— fin —</Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// Card memoizada (React.memo) → evita re-renders al filtrar/recargar
const UserCard = React.memo(function UserCard({
  profile,
  estadoUI: estado,
  onUpdate,
}: {
  profile: ProfileRow;
  estadoUI: string;
  onUpdate: (p: ProfileRow, nuevo: string) => Promise<void>;
}) {
  const nombre = profile.nombre || profile.full_name || '—';
  const telefono = profile.telefono || profile.phone || '—';
  const estadoColor = estado === 'activa' ? '#22c55e' : estado === 'denegado' ? '#ef4444' : '#F5A623';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{nombre}</Text>
        <View style={[styles.estadoBadge, { borderColor: estadoColor }]}>
          <Text style={[styles.estadoText, { color: estadoColor }]}>{estado}</Text>
        </View>
      </View>
      <Text style={styles.cardEmail}>{profile.email || '—'}</Text>
      <Text style={styles.cardMeta}>Tel: {telefono}</Text>
      {profile.created_at && (
        <Text style={styles.cardMeta}>Registro: {new Date(profile.created_at).toLocaleDateString()}</Text>
      )}

      <View style={styles.actions}>
        {estado !== 'activa' && (
          <Pressable
            style={({ pressed }) => [styles.btnAprobar, pressed && { opacity: 0.85 }]}
            onPress={() => onUpdate(profile, 'activa')}
          >
            <Text style={styles.btnText}>Aprobar</Text>
          </Pressable>
        )}
        {estado !== 'denegado' && (
          <Pressable
            style={({ pressed }) => [styles.btnRechazar, pressed && { opacity: 0.85 }]}
            onPress={() => onUpdate(profile, 'denegado')}
          >
            <Text style={styles.btnText}>Rechazar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 100 },
  errorBox: {
    backgroundColor: '#1F1B1B',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: '#EF4444', fontSize: 13 },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  headerSub: { color: '#9A9A9A', fontSize: 13, marginBottom: 16 },
  tabs: { flexDirection: 'row', marginBottom: 16 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tabActive: { borderColor: '#C9A84C', backgroundColor: '#C9A84C22' },
  tabText: { color: '#9A9A9A', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  tabTextActive: { color: '#C9A84C' },
  card: {
    backgroundColor: '#0E0E0E',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1 },
  estadoBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  estadoText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cardEmail: { color: '#9A9A9A', fontSize: 13, marginBottom: 4 },
  cardMeta: { color: '#6E6E6E', fontSize: 12, marginBottom: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnAprobar: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnRechazar: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  loadMore: {
    marginTop: 8,
    backgroundColor: '#1A1A1A',
    borderColor: '#C9A84C',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: { color: '#C9A84C', fontWeight: '700', letterSpacing: 0.5 },
  endText: { color: '#6E6E6E', fontSize: 12, textAlign: 'center', marginTop: 12 },
});