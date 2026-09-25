import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Property, formatPrice, formatSurface, getReturnColor } from '@/lib/properties-data';
import { useFavorites } from '@/hooks/use-favorites';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getFirstImage } from '@/lib/property-media';

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
}

export function PropertyCard({ property, compact = false }: PropertyCardProps) {
  const { isFav, toggleFav } = useFavorites();
  const favorite = isFav(property.id);
  const returnColor = getReturnColor(property.returnRate);

  const thumbUri = getFirstImage(
    property.fotos ?? property.images ?? property.imagenes,
    property.portada_url,
  );

  const videoUrl = property.video_url ?? property.videos?.[0] ?? null;
  const hasVideo = Boolean(videoUrl);

  const handlePress = () => {
    router.push(
      `/property/${property.id}${hasVideo ? '?play=1' : ''}` as any,
    );
  };

  const handleFavorite = () => {
    toggleFav(property.id);
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.pressed,
        ]}
      >
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.compactImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.compactImage, styles.noPhotoFallback]}>
            <IconSymbol name="house.fill" size={32} color="#C9A84C" />
          </View>
        )}

        <View style={styles.compactOverlay} pointerEvents="none" />

        <View style={styles.compactTopRow} pointerEvents="none">
          <View style={styles.compactCodeBadge}>
            <Text style={styles.compactCodeText}>EYESITE · #{property.code}</Text>
          </View>
          {hasVideo && (
            <View style={styles.compactMediaBadge}>
              <IconSymbol name="play.circle.fill" size={10} color="#0E0E0E" />
            </View>
          )}
        </View>

        <View style={styles.compactContent}>
          <View style={styles.compactReturnRow}>
            <View
              style={[
                styles.returnBadge,
                {
                  backgroundColor: `${returnColor}22`,
                  borderColor: `${returnColor}99`,
                },
              ]}
            >
              <Text style={[styles.returnBadgeText, { color: returnColor }]}>
                +{property.returnRate}%
              </Text>
            </View>
          </View>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {property.title}
          </Text>
          <View style={styles.compactLocationRow}>
            <IconSymbol name="location.fill" size={10} color="#C9A84C" />
            <Text style={styles.compactLocation} numberOfLines={1}>
              {property.municipality}
            </Text>
          </View>
          <Text style={styles.compactPrice}>
            {formatPrice(property.currentPrice, property.priceUnit)}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageContainer}>
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.image, styles.noPhotoFallback]}>
            <IconSymbol name="house.fill" size={42} color="#C9A84C" />
            <Text style={styles.noPhotoText}>EYESITE</Text>
          </View>
        )}

        <View style={styles.imageVignette} pointerEvents="none" />

        <View style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.codeBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.codeBadgeText}>EYESITE · #{property.code}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            accessibilityState={{ selected: favorite }}
            onPress={handleFavorite}
            hitSlop={8}
            style={({ pressed }) => [
              styles.favoriteBtn,
              pressed && styles.favoritePressed,
            ]}
          >
            <IconSymbol
              name={favorite ? 'heart.fill' : 'heart'}
              size={17}
              color={favorite ? '#C9A84C' : '#F5F5F5'}
            />
          </Pressable>
        </View>

        <View style={styles.bottomOverlay} pointerEvents="none">
          <View
            style={[
              styles.returnBadge,
              {
                backgroundColor: `${returnColor}24`,
                borderColor: `${returnColor}AA`,
              },
            ]}
          >
            <Text style={[styles.returnBadgeText, { color: returnColor }]}>
              +{property.returnRate}% rendimiento
            </Text>
          </View>

          {hasVideo && (
            <View style={styles.videoBadge}>
              <IconSymbol name="play.circle.fill" size={10} color="#0E0E0E" />
              <Text style={styles.videoBadgeText}>VIDEO</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {property.title}
          </Text>
          <IconSymbol name="chevron.right" size={13} color="#666" />
        </View>

        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <IconSymbol name="location.fill" size={11} color="#C9A84C" />
          </View>
          <Text style={styles.location} numberOfLines={1}>
            {property.location}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>PRECIO ACTUAL</Text>
            <Text style={styles.price} numberOfLines={1}>
              {formatPrice(property.currentPrice, property.priceUnit)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricRight}>
            <Text style={styles.metricLabel}>SUPERFICIE</Text>
            <Text style={styles.surface} numberOfLines={1}>
              {formatSurface(property.surfaceM2)}
            </Text>
          </View>
        </View>

        <View style={styles.marketRow}>
          <View style={styles.marketLine} />
          <Text style={styles.marketLabel}>VALOR DE MERCADO</Text>
          <Text style={styles.marketPrice} numberOfLines={1}>
            {formatPrice(property.marketPrice, property.priceUnit)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#141414',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 5,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 10,
    minHeight: 185,
    maxHeight: 270,
    backgroundColor: '#0E0E0E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.72)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.32)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
    marginRight: 6,
  },
  codeBadgeText: {
    color: '#E9E9E9',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.55,
  },
  favoriteBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.72)',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  favoritePressed: {
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  returnBadge: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  returnBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C9A84C',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  videoBadgeText: {
    color: '#0E0E0E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  title: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    letterSpacing: 0.05,
    paddingRight: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    marginBottom: 14,
  },
  locationIcon: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: 'rgba(201,168,76,0.10)',
    marginRight: 7,
  },
  location: {
    flex: 1,
    color: '#9A9A9A',
    fontSize: 12,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#222222',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  metric: {
    flex: 1,
    minWidth: 0,
  },
  metricRight: {
    flex: 0.82,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  metricLabel: {
    color: '#6F6F6F',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.75,
    marginBottom: 3,
  },
  price: {
    color: '#C9A84C',
    fontSize: 17,
    fontWeight: '800',
  },
  surface: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '700',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 12,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  marketLine: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9A84C',
    marginRight: 7,
  },
  marketLabel: {
    color: '#6F6F6F',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.55,
    marginRight: 6,
  },
  marketPrice: {
    flex: 1,
    color: '#777',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  noPhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotoText: {
    color: '#555',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 8,
  },

  // Compact / horizontal cards.
  compactCard: {
    width: 188,
    height: 228,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  compactTopRow: {
    position: 'absolute',
    top: 9,
    left: 9,
    right: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactCodeBadge: {
    backgroundColor: 'rgba(10,10,10,0.68)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  compactCodeText: {
    color: '#C9A84C',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.45,
  },
  compactMediaBadge: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A84C',
    borderRadius: 13,
  },
  compactContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  compactReturnRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  compactTitle: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 5,
  },
  compactLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  compactLocation: {
    flex: 1,
    color: '#B0B0B0',
    fontSize: 10,
    marginLeft: 5,
  },
  compactPrice: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '800',
  },
});
