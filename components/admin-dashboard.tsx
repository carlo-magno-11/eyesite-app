import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
// Cliente ÚNICO de Supabase (proyecto activo xhvpvpvtkdgnnxdwdrkn).
// No crear clientes locales: usar siempre @/lib/supabase
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  usersToday: number;
  lastUpdated: string;
}

// Cuenta filas de forma resiliente: si la columna no existe (PGRST204)
// o RLS bloquea la lectura, devuelve 0 en lugar de romper el UI.
async function safeCount(
  run: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>
): Promise<number> {
  try {
    const { count, error } = await run();
    if (error) {
      console.warn('[admin-dashboard] contador no disponible:', error.message);
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    usersToday: 0,
    lastUpdated: new Date().toLocaleTimeString(),
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const totalCount = await safeCount(() =>
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      );

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const activeCount = await safeCount(() =>
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('last_login_at', yesterday)
      );

      const adminCount = await safeCount(() =>
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin')
      );

      const today = new Date().toISOString().split('T')[0];
      const todayCount = await safeCount(() =>
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)
      );

      setStats({
        totalUsers: totalCount,
        activeUsers: activeCount,
        adminUsers: adminCount,
        usersToday: todayCount,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      console.warn('Error loading stats:', error);
      setStats((prev) => ({ ...prev, lastUpdated: new Date().toLocaleTimeString() }));
    }
  }, []);

  const setupRealtime = useCallback(() => {
    const subscription = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          void loadStats();
        }
      )
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStats();
    }, 0);
    const cleanupRealtime = setupRealtime();

    return () => {
      clearTimeout(timer);
      cleanupRealtime();
    };
  }, [loadStats, setupRealtime]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard Admin</Text>
        <Text style={styles.subtitle}>Estamos contigo en cualquier parte del mundo</Text>
        <Text style={styles.lastUpdated}>Actualizado: {stats.lastUpdated}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Usuarios Totales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeUsers}</Text>
          <Text style={styles.statLabel}>Activos (24h)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.adminUsers}</Text>
          <Text style={styles.statLabel}>Administradores</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.usersToday}</Text>
          <Text style={styles.statLabel}>Nuevos Hoy</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información en Tiempo Real</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>✅ Los datos se actualizan automáticamente cuando hay cambios</Text>
          <Text style={styles.infoText}>✅ Desliza hacia abajo para actualizar manualmente</Text>
          <Text style={styles.infoText}>✅ Monitoreo 24/7 de usuarios y actividad</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#C9A84C',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888580',
  },
  statsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.18)',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#C9A84C',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888580',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C9A84C',
  },
  infoText: {
    fontSize: 13,
    color: '#F5F2EC',
    marginBottom: 8,
    lineHeight: 20,
  },
});
