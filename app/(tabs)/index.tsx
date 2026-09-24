import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { ScreenContainer } from '@/components/screen-container';
import { PropertyCard } from '@/components/property-card';
import { router } from 'expo-router';
import { useProperties } from '@/hooks/use-properties';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/use-notifications';
import { useResponsive } from '@/hooks/use-responsive';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EYESITE_THEME } from '@/lib/eysite-theme';

const CATEGORIES = [
  { key: 'terreno', label: 'Terrenos', icon: '🌿' },
  { key: 'casa', label: 'Casas', icon: '🏠' },
  { key: 'hacienda', label: 'Haciendas', icon: '🏛️' },
  { key: 'rancho', label: 'Ranchos', icon: '🐄' },
  { key: 'industrial', label: 'Industrial', icon: '🏭' },
];

export default function HomeScreen() {
  const { properties, loading } = useProperties();
  const { user, session } = useAuth();
  const { unread } = useNotifications(user?.id);
  const { horizontalPadding, contentMaxWidth, isDesktop, isLargeDesktop } = useResponsive();
  const featuredProperties = properties.filter((p) => p.featured || p.destacada);
  // Si todavía no hay propiedades marcadas como destacadas, mostramos las
  // primeras oportunidades reales para evitar una sección vacía en producción.
  const highlightedProperties =
    featuredProperties.length > 0
      ? featuredProperties
      : properties.slice(0, 6);

  const handleCategoryPress = (key: string) => {
    router.push({ pathname: '/(tabs)/properties', params: { filter: key } } as any);
  };


  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-[#0B0B0B]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110, backgroundColor: EYESITE_THEME.colors.background }}
      >
        {/* Header with Tagline */}
        <View style={[styles.taglineContainer, { paddingHorizontal: horizontalPadding }]}>
          <Text style={styles.tagline}>Estamos contigo en cualquier parte del mundo</Text>
        </View>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.centeredContent]}>
          <Text style={styles.logo}>EYESI<Text style={styles.logoPlus}>+</Text>E</Text>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => router.push((session ? '/mi-cuenta' : '/(auth)/login') as any)}
              accessibilityRole="button"
              accessibilityLabel={session ? "Mi cuenta" : "Iniciar sesión"}
              style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="person-circle-outline" size={22} color="#C9A84C" />
            </Pressable>
            <Pressable
              onPress={() => router.push((session ? '/notifications' : '/(auth)/login') as any)}
              accessibilityRole="button"
              accessibilityLabel={session ? "Notificaciones" : "Iniciar sesión"}
              style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.7 }]}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications-outline" size={20} color="#C9A84C" />
                {unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text></View>}
              </View>
            </Pressable>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={[styles.heroBanner, { height: isLargeDesktop ? 380 : isDesktop ? 340 : 300, marginHorizontal: isDesktop ? horizontalPadding : 16, maxWidth: contentMaxWidth }, isDesktop && styles.centeredContent]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80' }}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
          <LinearGradient
            colors={["transparent", "rgba(11,11,11,0.82)"]}
            style={styles.heroOverlay}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTagline}>FIND YOUR LAND</Text>
            <Text style={[styles.heroTitle, { fontSize: isLargeDesktop ? 30 : isDesktop ? 26 : 22 }]}>TODO BUEN PROYECTO INICIA CON UN BUEN TERRENO</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/properties' as any)}
              style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.heroButtonText}>VER OPORTUNIDADES</Text>
            </Pressable>
          </View>
        </View>

        {/* Categorías */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.centeredContent]}>
          <Text style={styles.sectionTitle}>CATEGORÍAS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => handleCategoryPress(cat.key)}
                style={({ pressed }) => [styles.categoryCard, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.categoryIconWrap}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Oportunidades Destacadas */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.centeredContent]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>OPORTUNIDADES DESTACADAS</Text>
            <Pressable onPress={() => router.push('/(tabs)/properties' as any)}>
              <Text style={styles.viewAllLink}>Ver todas →</Text>
            </Pressable>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#C9A84C" size="large" />
            </View>
          ) : (
            <View style={isDesktop ? styles.featuredGrid : undefined}>
              {highlightedProperties.map((property) => (
                <View key={property.id} style={isDesktop ? styles.featuredItem : undefined}>
                  <PropertyCard property={property} />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centeredContent: {
    width: '100%',
    alignSelf: 'center',
  },
  taglineContainer: {
    backgroundColor: EYESITE_THEME.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: EYESITE_THEME.colors.gold,
  },
  tagline: {
    fontSize: 13,
    color: EYESITE_THEME.colors.gold,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unreadBadge: { position: 'absolute', top: -7, right: -8, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 8, backgroundColor: EYESITE_THEME.colors.gold, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#0E0E0E', fontSize: 9, fontWeight: '800' },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C9A84C',
    letterSpacing: 1,
  },
  logoPlus: {
    color: '#C9A84C',
  },
  contactBtn: { position: 'relative',
    
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBanner: {
    position: 'relative',
    height: 300,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroTagline: {
    fontSize: 12,
    color: '#C9A84C',
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: EYESITE_THEME.colors.text,
    marginBottom: 16,
    lineHeight: 28,
  },
  heroButton: {
    backgroundColor: '#C9A84C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: EYESITE_THEME.colors.background,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 1,
  },
  section: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  viewAllLink: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryCard: {
    alignItems: 'center',
    width: 92,
    marginRight: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: EYESITE_THEME.colors.surface,
    borderWidth: 1,
    borderColor: EYESITE_THEME.colors.border,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EYESITE_THEME.colors.surfaceSoft,
    marginBottom: 8,
  },
  categoryIcon: { fontSize: 25 },
  categoryLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featuredItem: {
    width: '32%',
  },
});