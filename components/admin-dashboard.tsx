import React, { useEffect, useState } from 'react';
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

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    usersToday: 0,
    lastUpdated: new Date().toLocaleTimeString(),
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
    setupRealtime();
  }, []);

  const setupRealtime = () => {
    // Subscribe to real-time changes on profiles table
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
          loadStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  // Cuenta filas de forma resiliente: si la columna no existe (PGRST204)
  // o RLS bloquea la lectura, devuelve 0 en lugar de romper el UI.
  const safeCount = async (
    run: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>
  ): Promise<number> => {
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
  };

  const loadStats = async () => {
    try {
      // Total users = count(profiles)
      const totalCount = await safeCount(() =>
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      );

      // Active users (logged in last 24 hours) — solo si existe last_login_at
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const activeCount = await safeCount(() =>
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('last_login_at', yesterday)
      );

      // Admin users — solo si existe la columna role; si no existe, 0
      const adminCount = await safeCount(() =>
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin')
      );

      // Users created today — solo si existe la columna created_at
      const today = new Date().toISOString().split('T')[0];
      const todayCount = await safeCount(() =>
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)
      );

      setStats({
        totalUsers: totalCount || 0,
        activeUsers: activeCount || 0,
        adminUsers: adminCount || 0,
        usersToday: todayCount || 0,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      // Nunca crashear el UI: los contadores se quedan en 0
      console.warn('Error loading stats:', error);
      setStats((prev) => ({ ...prev, lastUpdated: new Date().toLocaleTimeString() }));
    }
  };

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
        {/* Total Users */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Usuarios Totales</Text>
        </View>

        {/* Active Users */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeUsers}</Text>
          <Text style={styles.statLabel}>Activos (24h)</Text>
        </View>

        {/* Admin Users */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.adminUsers}</Text>
          <Text style={styles.statLabel}>Administradores</Text>
        </View>

        {/* Users Today */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.usersToday}</Text>
          <Text style={styles.statLabel}>Nuevos Hoy</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información en Tiempo Real</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✅ Los datos se actualizan automáticamente cuando hay cambios
          </Text>
          <Text style={styles.infoText}>
            ✅ Desliza hacia abajo para actualizar manualmente
          </Text>
          <Text style={styles.infoText}>
            ✅ Monitoreo 24/7 de usuarios y actividad
          </Text>
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
