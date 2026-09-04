import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ADMIN_MENU = [
  {
    id: 'solicitudes',
    title: 'Solicitudes Pendientes',
    description: 'Revisar y aprobar propiedades enviadas por usuarios',
    icon: '📋',
    route: '/admin/solicitudes',
    color: '#FF6B6B',
  },
  {
    id: 'propiedades',
    title: 'Propiedades Publicadas',
    description: 'Gestionar propiedades activas en la plataforma',
    icon: '🏢',
    route: '/admin/propiedades',
    color: '#4ECDC4',
  },
  {
    id: 'estadisticas',
    title: 'Estadísticas',
    description: 'Ver métricas y actividad en tiempo real',
    icon: '📊',
    route: '/admin/estadisticas',
    color: '#45B7D1',
  },
];

export default function AdminDashboard() {
  const handleMenuPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>EYESI<Text style={styles.logoPlus}>+</Text>E</Text>
          <Text style={styles.subtitle}>Panel de Administración</Text>
          <Text style={styles.tagline}>Gestiona tu plataforma inmobiliaria</Text>
        </View>

        {/* Menu Grid */}
        <View style={styles.menuContainer}>
          {ADMIN_MENU.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleMenuPress(item.route)}
              style={({ pressed }) => [
                styles.menuCard,
                { borderLeftColor: item.color },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.menuCardContent}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color="#C9A84C" />
            </Pressable>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Resumen Rápido</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Solicitudes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Propiedades</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Usuarios</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#C9A84C',
    letterSpacing: 1,
    marginBottom: 8,
  },
  logoPlus: {
    color: '#C9A84C',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: '#9A9A9A',
    fontStyle: 'italic',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  menuCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    fontSize: 32,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: '#9A9A9A',
    lineHeight: 16,
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C9A84C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#9A9A9A',
    fontWeight: '500',
  },
});
