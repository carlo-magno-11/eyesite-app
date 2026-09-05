import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Property, formatPrice, formatSurface, getReturnColor } from '@/lib/properties-data';
import { useFavorites } from '@/hooks/use-favorites';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
}

export function PropertyCard({ property, compact = false }: PropertyCardProps) {
const { isFav, toggleFav } = useFavorites();
  const favorite = isFav(property.id);
  const returnColor = getReturnColor(property.returnRate);
  const esVideoPortada = property.tipo_portada === 'video';
  const thumbUri = esVideoPortada && property.portada_url ? property.portada_url : property.images?.[0];

  const handlePress = () => {
    router.push(`/property/${property.id}` as any);
  };

  const handleFavorite = () => {
    toggleFav(property.id);
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.compactCard, pressed && { opacity: 0.8 }]}
      >
        <Image source={{ uri: thumbUri }} style={styles.compactImage} resizeMode="cover" />
        <View style={styles.compactOverlay} />
        {esVideoPortada && (
          <View style={styles.videoPlayOverlay} pointerEvents="none">
            <Text style={styles.videoPlayIcon}>▶</Text>
          </View>
        )}
        <View style={styles.compactContent}>
          <View style={[styles.returnBadge, { backgroundColor: returnColor + '33', borderColor: returnColor }]}>
            <Text style={[styles.returnBadgeText, { color: returnColor }]}>
              +{property.returnRate}%
            </Text>
          </View>
          <Text style={styles.compactTitle} numberOfLines={2}>{property.title}</Text>
          <Text style={styles.compactLocation} numberOfLines={1}>{property.municipality}</Text>
          <Text style={styles.compactPrice}>{formatPrice(property.currentPrice, property.priceUnit)}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: thumbUri }} style={styles.image} resizeMode="cover" />
        <View style={styles.imageOverlay} />
        {esVideoPortada && (
          <View style={styles.videoPlayOverlay} pointerEvents="none">
            <Text style={styles.videoPlayIcon}>▶</Text>
          </View>
        )}
        {/* Property Code - Subtle */}
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText}>#{property.code}</Text>
        </View>
        <Pressable
          onPress={handleFavorite}
          style={({ pressed }) => [styles.favoriteBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.favoriteHeart}>{favorite ? '♥️' : '♡'}</Text>
        </Pressable>
        <View style={[styles.returnBadge, { backgroundColor: returnColor + '33', borderColor: returnColor }]}>
          <Text style={[styles.returnBadgeText, { color: returnColor }]}>
            +{property.returnRate}%
          </Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{property.title}</Text>
        <View style={styles.locationRow}>
          <IconSymbol name="location.fill" size={12} color="#9A9A9A" />
          <Text style={styles.location}>{property.location}</Text>
        </View>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Precio actual</Text>
            <Text style={styles.price}>{formatPrice(property.currentPrice, property.priceUnit)}</Text>
          </View>
          <View style={styles.surfaceContainer}>
            <Text style={styles.priceLabel}>Superficie</Text>
            <Text style={styles.surface}>{formatSurface(property.surfaceM2)}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.marketRow}>
          <Text style={styles.marketLabel}>Precio mercado: </Text>
          <Text style={styles.marketPrice}>{formatPrice(property.marketPrice, property.priceUnit)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    fontSize: 34,
    color: '#C9A84C',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  favoriteHeart: {
    fontSize: 20,
    color: '#C9A84C',
  },
  codeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  codeBadgeText: {
    color: '#C9A84C',
    fontSize: 10,
    fontWeight: '600',
  },
  returnBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  returnBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 14,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  location: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  priceLabel: {
    color: '#9A9A9A',
    fontSize: 11,
    marginBottom: 2,
  },
  price: {
    color: '#C9A84C',
    fontSize: 16,
    fontWeight: '700',
  },
  surfaceContainer: {
    alignItems: 'flex-end',
  },
  surface: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 10,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketLabel: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  marketPrice: {
    color: '#9A9A9A',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  // Compact styles
  compactCard: {
    width: 180,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  compactCodeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  compactCodeText: {
    color: '#C9A84C',
    fontSize: 9,
    fontWeight: '600',
  },
  compactContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  compactTitle: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 17,
  },
  compactLocation: {
    color: '#9A9A9A',
    fontSize: 11,
    marginBottom: 4,
  },
  compactPrice: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '700',
  },
});
