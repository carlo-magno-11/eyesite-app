import { View, Text, ScrollView, Image, Pressable, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { PropertyCard } from '@/components/property-card';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useProperties } from '@/hooks/use-properties';

const CATEGORIES = [
  { key: 'terreno', label: 'Terrenos', icon: '🌿' },
  { key: 'casa', label: 'Casas', icon: '🏠' },
  { key: 'hacienda', label: 'Haciendas', icon: '🏛️' },
  { key: 'rancho', label: 'Ranchos', icon: '🐄' },
  { key: 'industrial', label: 'Industrial', icon: '🏭' },
];

const APP_SHARE_LINK = 'https://manus.im/app-preview/GBpSYRgq5Ti3eJwGizWHuy?sessionId=lBk41uIGi0STu1s1czqcRq';

export default function HomeScreen() {
  const { properties, loading } = useProperties();
  const featuredProperties = properties.filter((p) => p.featured || p.destacada);

  const handleCategoryPress = (key: string) => {
    router.push({ pathname: '/(tabs)/properties', params: { filter: key } } as any);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: `Descubre las mejores oportunidades inmobiliarias en Yucatán con EYESITE. Accede a la app aquí: ${APP_SHARE_LINK}`,
        url: APP_SHARE_LINK,
        title: 'EYESITE - Propiedades Inmobiliarias',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-[#0D0D0D]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, backgroundColor: '#0D0D0D' }}
      >
        {/* Header with Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Estamos contigo en cualquier parte del mundo</Text>
        </View>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>EYESI<Text style={styles.logoPlus}>+</Text>E</Text>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={handleShareApp}
              style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="square.and.arrow.up" size={16} color="#C9A84C" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/contact' as any)}
              style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="phone.fill" size={16} color="#C9A84C" />
            </Pressable>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80' }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTagline}>FIND YOUR LAND</Text>
            <Text style={styles.heroTitle}>TODO BUEN PROYECTO INICIA CON UN BUEN TERRENO</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/properties' as any)}
              style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.heroButtonText}>VER OPORTUNIDADES</Text>
            </Pressable>
          </View>
        </View>

        {/* Categorías */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATEGORÍAS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => handleCategoryPress(cat.key)}
                style={({ pressed }) => [styles.categoryCard, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Oportunidades Destacadas */}
        <View style={styles.section}>
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
            featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  taglineContainer: {
    backgroundColor: '#1C1C1C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C9A84C',
  },
  tagline: {
    fontSize: 13,
    color: '#C9A84C',
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
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtn: {
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    color: '#FFFFFF',
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
    color: '#0D0D0D',
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
    marginRight: 16,
    paddingVertical: 12,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
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
});