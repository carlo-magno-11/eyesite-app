import { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Linking, StyleSheet, Dimensions, Share, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { formatPrice, formatSurface, getReturnColor } from '@/lib/properties-data';
import { useFavorites } from '@/hooks/use-favorites';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/screen-container';
import { useProperty } from '@/hooks/use-properties';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WHATSAPP = '+52 9813674060';
const PHONE = '+52 9813674060';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { property, loading } = useProperty(id);
  const { isFav, toggleFav } = useFavorites();
  const [activeImage, setActiveImage] = useState(0);

  // Portada intercambiable video/foto (anti-trabe: sin player ni autoplay en la
  // vista normal; el video solo se reproduce dentro del Modal al tocar Play)
  const videos = property?.videos || [];
  const tipoPortada = property?.tipo_portada || 'foto';
  const usarVideoPortada = tipoPortada === 'video' && videos.length > 0;

  // Video del terreno (sección + modal). Sin autoplay en lista: solo al tocar play.
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const videoUrl: string | null = property?.video_url || (videos.length > 0 ? videos[0] : null);
  const videoEnPortada = usarVideoPortada;
  const modalPlayer = useVideoPlayer(videoUrl ? videoUrl : null, (p) => {
    p.loop = false;
  });

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.notFound}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.notFoundText}>Cargando propiedad...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!property) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Propiedad no encontrada</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const favorite = isFav(property.id);
  const returnColor = getReturnColor(property.returnRate);

  // Galería 100% de imágenes (sin <Video>): la portada en video se representa
  // con su thumbnail + botón Play dorado que abre el Modal.
  const portadaThumb: string | null =
    property.portada_url || (property.images || [])[0] || null;
  const mediaItems = usarVideoPortada && portadaThumb
    ? [{ type: 'image', url: portadaThumb }, ...(property.images || []).map((u: string) => ({ type: 'image', url: u }))]
    : (property.images || []).map((u: string) => ({ type: 'image', url: u }));

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hola, me interesa la propiedad: ${property.title || property.titulo} en ${property.location || property.municipio}. ¿Podría darme más información?`
    );
    Linking.openURL(`https://wa.me/${WHATSAPP}?text=${msg}`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${PHONE}`);
  };

  const handleShareProperty = async () => {
    try {
      const appLink = `https://eyesiteapp-gbpsyrgq.manus.space/property/${property.id}`;
      const message = `Mira esta propiedad en EYESITE: ${property.title || property.titulo} en ${property.location || property.municipio}. Precio: ${formatPrice(property.currentPrice || property.precio_actual, property.priceUnit || property.unidad_precio)}. Descarga la app: https://manus.im/app-preview/GBpSYRgq5Ti3eJwGizWHuy?sessionId=lBk41uIGi0STu1s1czqcRq`;
      
      await Share.share({
        message: message,
        title: `Propiedad: ${property.title || property.titulo}`,
        url: appLink,
      });
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  const returnDiff = (property.marketPrice || property.precio_mercado) > 0
    ? Math.round((((property.marketPrice || property.precio_mercado) - (property.currentPrice || property.precio_actual)) / (property.marketPrice || property.precio_mercado)) * 100)
    : 0;

  const videoPoster: string | null =
    property?.portada_url || (property?.images || property?.fotos || [])[0] || null;

  const openVideoModal = () => {
    setVideoModalVisible(true);
    try {
      modalPlayer.currentTime = 0;
      modalPlayer.play();
    } catch (e) {
      console.log('No se pudo reproducir el video:', e);
    }
  };

  const closeVideoModal = () => {
    try {
      modalPlayer.pause();
    } catch (e) {
      console.log('No se pudo pausar el video:', e);
    }
    setVideoModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Galería de imágenes */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImage(index);
            }}
            scrollEventThrottle={16}
          >
            {mediaItems.map((item, idx) => (
              <Image key={idx} source={{ uri: item.url }} style={styles.galleryImage} resizeMode="cover" />
            ))}
          </ScrollView>
          <View style={styles.galleryOverlay} />

          {/* Play de portada: el video solo se reproduce en el Modal */}
          {usarVideoPortada && videoUrl && (
            <Pressable
              onPress={openVideoModal}
              style={({ pressed }) => [styles.portadaPlayButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.portadaPlayIcon}>▶</Text>
            </Pressable>
          )}

          {/* Botón atrás */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="chevron.left" size={20} color="#F5F5F5" />
          </Pressable>

          {/* Botón compartir */}
          <Pressable
            onPress={handleShareProperty}
            style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="paperplane.fill" size={20} color="#ffffff" />
          </Pressable>

          {/* Botón favorito */}
          <Pressable
            onPress={() => toggleFav(property.id)}
            style={({ pressed }) => [styles.favoriteButton, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol
              name={favorite ? 'heart.fill' : 'heart'}
              size={22}
              color={favorite ? '#C9A84C' : '#ffffff'}
            />
          </Pressable>

          {/* Indicador de imágenes */}
          {mediaItems.length > 1 && (
            <View style={styles.imageDots}>
              {mediaItems.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === activeImage && styles.dotActive]}
                />
              ))}
            </View>
          )}

          {/* Badge de rendimiento */}
          <View style={[styles.returnBadge, { backgroundColor: returnColor + '33', borderColor: returnColor }]}>
            <Text style={[styles.returnBadgeText, { color: returnColor }]}>
              +{property.returnRate}% rendimiento
            </Text>
          </View>
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          {/* Tipo */}
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{(property.type || property.tipo || 'PROPIEDAD').toUpperCase()}</Text>
          </View>

          {/* Título y ubicación */}
          <Text style={styles.title}>{property.title || property.titulo}</Text>
          <View style={styles.locationRow}>
            <IconSymbol name="location.fill" size={14} color="#C9A84C" />
            <Text style={styles.location}>{property.location || property.municipio}</Text>
          </View>

          {/* Métricas principales */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Precio actual</Text>
              <Text style={styles.metricValue}>{formatPrice(property.currentPrice || property.precio_actual, property.priceUnit || property.unidad_precio)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Precio mercado</Text>
              <Text style={[styles.metricValue, styles.metricValueMuted]}>
                {formatPrice(property.marketPrice || property.precio_mercado, property.priceUnit || property.unidad_precio)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Superficie</Text>
              <Text style={styles.metricValue}>{formatSurface(property.surfaceM2 || property.superficie)}</Text>
            </View>
            {property.constructionM2 > 0 && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Construcción</Text>
                <Text style={styles.metricValue}>{formatSurface(property.constructionM2)}</Text>
              </View>
            )}
          </View>

          {/* Rendimiento destacado */}
          <View style={[styles.returnCard, { borderColor: returnColor + '55' }]}>
            <View>
              <Text style={styles.returnCardLabel}>Rendimiento a la compra</Text>
              <Text style={styles.returnCardSub}>
                {returnDiff > 0 ? `${returnDiff}% por debajo del mercado` : 'Al precio de mercado'}
              </Text>
            </View>
            <Text style={[styles.returnCardValue, { color: returnColor }]}>
              +{property.returnRate}%
            </Text>
          </View>

          {/* Video del terreno */}
          {videoUrl && !videoEnPortada && (
            <View style={styles.videoSection}>
              <Text style={styles.descTitle}>VIDEO DEL TERRENO</Text>
              <Pressable
                onPress={openVideoModal}
                style={({ pressed }) => [styles.videoPoster, pressed && { opacity: 0.9 }]}
              >
                {videoPoster ? (
                  <Image source={{ uri: videoPoster }} style={styles.videoPosterImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.videoPosterImage, styles.videoPosterPlaceholder]}>
                    <Text style={styles.videoPosterPlaceholderText}>🎬</Text>
                  </View>
                )}
                <View style={styles.videoPosterOverlay} />
                <View style={styles.playButton}>
                  <Text style={styles.playIcon}>▶</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* Descripción */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>DESCRIPCIÓN</Text>
            <Text style={styles.descText}>{property.description || property.descripcion || 'Sin descripción disponible'}</Text>
          </View>

          {/* Certeza legal */}
          <View style={styles.legalNote}>
            <Text style={styles.legalIcon}>⚖️</Text>
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>Certeza Legal Garantizada</Text>
              <Text style={styles.legalText}>
                Esta propiedad cuenta con documentación legal verificada por el equipo Eyesite.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botones de acción fijos */}
      <View style={styles.actionBar}>
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.8 }]}
        >
          <IconSymbol name="phone.fill" size={18} color="#C9A84C" />
          <Text style={styles.callBtnText}>Llamar</Text>
        </Pressable>
        <Pressable
          onPress={handleWhatsApp}
          style={({ pressed }) => [styles.whatsappBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.whatsappBtnText}>AGENDAR LLAMADA</Text>
        </Pressable>
      </View>

      {/* Modal de video del terreno */}
      <Modal
        visible={videoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeVideoModal}
      >
        <View style={styles.videoModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeVideoModal} />
          <View style={styles.videoModalContent}>
            {videoUrl && (
              <VideoView
                player={modalPlayer}
                style={styles.videoModalPlayer}
                contentFit="contain"
                nativeControls
              />
            )}
            <Pressable onPress={closeVideoModal} style={styles.videoModalClose}>
              <Text style={styles.videoModalCloseText}>✕</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  portadaPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portadaPlayIcon: {
    color: '#0D0D0D',
    fontSize: 24,
    marginLeft: 3,
  },
  galleryContainer: {
    height: 320,
    position: 'relative',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 320,
  },
  galleryVideoContainer: {
    width: SCREEN_WIDTH,
    height: 320,
    backgroundColor: '#000',
  },
  galleryVideo: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 10,
  },
  shareButton: {
    position: 'absolute',
    top: 52,
    right: 68,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 10,
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#C9A84C',
    width: 18,
  },
  returnBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  returnBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 10,
  },
  typeTagText: {
    color: '#9A9A9A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  location: {
    color: '#9A9A9A',
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  metricLabel: {
    color: '#9A9A9A',
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#C9A84C',
    fontSize: 15,
    fontWeight: '700',
  },
  metricValueMuted: {
    color: '#9A9A9A',
    textDecorationLine: 'line-through',
    fontSize: 14,
  },
  returnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  returnCardLabel: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  returnCardSub: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  returnCardValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  descSection: {
    marginBottom: 20,
  },
  descTitle: {
    color: '#9A9A9A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  descText: {
    color: '#F5F5F5',
    fontSize: 14,
    lineHeight: 22,
  },
  legalNote: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C9A84C33',
    gap: 12,
    alignItems: 'flex-start',
  },
  legalIcon: {
    fontSize: 20,
  },
  legalContent: {
    flex: 1,
  },
  legalTitle: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  legalText: {
    color: '#9A9A9A',
    fontSize: 12,
    lineHeight: 18,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  callBtnText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '700',
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#C9A84C',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtnText: {
    color: '#0D0D0D',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  videoSection: {
    marginBottom: 20,
  },
  videoPoster: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  videoPosterImage: {
    width: '100%',
    height: '100%',
  },
  videoPosterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPosterPlaceholderText: {
    fontSize: 40,
  },
  videoPosterOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -32,
    marginLeft: -32,
    backgroundColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#0D0D0D',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 4,
  },
  videoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalContent: {
    width: SCREEN_WIDTH - 32,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoModalPlayer: {
    width: '100%',
    height: '100%',
  },
  videoModalClose: {
    position: 'absolute',
    top: -44,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalCloseText: {
    color: '#C9A84C',
    fontSize: 16,
    fontWeight: '700',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: {
    color: '#F5F5F5',
    fontSize: 16,
  },
  backBtn: {
    padding: 12,
  },
  backBtnText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '600',
  },
});
