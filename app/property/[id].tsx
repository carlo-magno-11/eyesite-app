import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet, Share, ActivityIndicator, Modal, FlatList, Alert, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { formatPrice, formatSurface, getReturnColor } from '@/lib/properties-data';
import { useFavorites } from '@/hooks/use-favorites';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/screen-container';
import { useProperty } from '@/hooks/use-properties';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCommercial } from '@/hooks/use-commercial';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/lib/i18n';

const WHATSAPP = '+52 9813674060';
const PHONE = '+52 9813674060';

export default function PropertyDetailScreen() {
  const { id, play } = useLocalSearchParams<{ id: string; play?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const contentWidth = Math.min(windowWidth, 1200);
  const galleryHeight = Math.max(260, Math.min(Math.round(windowWidth * 0.56), windowWidth >= 1024 ? 560 : 420));
  const { property, loading } = useProperty(id);
  const { session } = useAuth();
  const { trackPropertyEvent, registerProspectInterest } = useCommercial();
  const { isFav, toggleFav } = useFavorites();
  const [activeImage, setActiveImage] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [signedDocuments, setSignedDocuments] = useState<Record<string, string>>({});
  const [loadingDocument, setLoadingDocument] = useState<string | null>(null);

  useEffect(() => {
    if (!property?.id || !session?.user?.id) return;
    void trackPropertyEvent(property.id, 'view');
  }, [property?.id, session?.user?.id, trackPropertyEvent]);

  const privateDocumentPaths = useMemo(() => {
    if (!property) return [];
    const items: string[] = [];
    const add = (value: any) => {
      if (typeof value === 'string' && value.trim()) items.push(value.trim());
      else if (value && typeof value === 'object') add(value.path || value.url || value.publicUrl);
    };
    (property.pdfs || []).forEach(add);
    (property.kmz_kml || []).forEach(add);
    (property.archivos || []).forEach(add);
    return [...new Set(items)];
  }, [property]);

  const openPrivateDocument = async (path: string) => {
    if (!property?.id || !session?.user?.id) return;
    const cacheKey = `${session.user.id}:${property.id}:${path}`;
    const cachedUrl = signedDocuments[cacheKey];
    if (cachedUrl) {
      await Linking.openURL(cachedUrl);
      return;
    }

    setLoadingDocument(path);
    try {
      const { data, error } = await supabase.functions.invoke('get-property-document', {
        body: { property_id: property.id, path },
      });
      if (error || !data?.signedUrl) {
        console.warn('[property] document access:', error?.message ?? 'No se recibió una URL firmada');
        return;
      }
      setSignedDocuments((current) => ({ ...current, [cacheKey]: data.signedUrl }));
      await Linking.openURL(data.signedUrl);
    } finally {
      setLoadingDocument(null);
    }
  };

  // Portada intercambiable video/foto (anti-trabe: sin player ni autoplay en la
  // vista normal; el video solo se reproduce dentro del Modal al tocar Play)
  const videos = property?.videos || [];
  // videos[0] feed para el player del carrusel (El Modal con modalPlayer sigue
  // usándose para el auto-play desde la card con ?play=1)

  // Video del terreno (sección + modal). Sin autoplay en lista: solo al tocar play.
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const videoUrl: string | null = property?.video_url || (videos.length > 0 ? videos[0] : null);
  const modalPlayer = useVideoPlayer(videoUrl ? videoUrl : null, (p) => {
    p.loop = false;
  });

  // V5: auto-abrir el reproductor cuando la card navega con ?play=1 (video desde la card)
  useEffect(() => {
    if (play !== '1' || !videoUrl || loading) return;

    const timer = setTimeout(() => {
      setVideoModalVisible(true);
      try {
        modalPlayer.play();
      } catch {}
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, videoUrl, loading]);

  const [videoPlaying, setVideoPlaying] = useState(false);

  // V6.3: player inline para el slide de video del carrusel (independiente del Modal)
  const carouselPlayer = useVideoPlayer(videoUrl ? videoUrl : null, (p) => {
    p.loop = false;
  });

  const handleCarouselPlay = () => {
    try {
      carouselPlayer.play();
      setVideoPlaying(true);
    } catch (e) {
      console.log('No se pudo reproducir el video del carrusel:', e);
    }
  };

  // Orden fijo: portada (foto) → video (con poster) → resto de la galería
  const mediaList = useMemo(() => {
    if (!property) {
      return [] as { type: 'image' | 'video'; url: string; poster?: string; id: string }[];
    }
    const list: { type: 'image' | 'video'; url: string; poster?: string; id: string }[] = [];
    const fotosRaw: any[] = ((property as any).fotos || property.images || []) as any[];
    const urlOf = (f: any) => (typeof f === 'string' ? f : f?.url || f?.uri || null);
    // 1) PORTADA (foto, SIEMPRE primero)
    if (property.portada_url) {
      list.push({ type: 'image', url: property.portada_url, id: 'portada' });
    }
    // 2) VIDEO (segundo, con poster = portada)
    if (videoUrl) {
      list.push({
        type: 'video',
        url: videoUrl,
        poster: property.portada_url || urlOf(fotosRaw[0]) || undefined,
        id: 'video',
      });
    }
    // 3) Galería normal
    fotosRaw.forEach((f, i) => {
      const url = urlOf(f);
      if (!url) return;
      if (url === property.portada_url && i === 0) return;
      if (url === videoUrl) return;
      if (list.some((m) => m.url === url)) return;
      list.push({ type: 'image', url, id: `f-${i}` });
    });

    // 4) Fotografías profesionales.
    // Se muestran después de la galería normal, pero siguen siendo
    // parte de los medios públicos aprobados de la propiedad.
    const fotosProRaw: any[] = ((property as any).fotos_pro || []) as any[];
    fotosProRaw.forEach((f, i) => {
      const url = urlOf(f);
      if (!url || list.some((m) => m.url === url)) return;
      list.push({ type: 'image', url, id: `pro-${i}` });
    });

    return list;
  }, [property, videoUrl]);

  // Precalentamos la galería en la caché nativa/Web para evitar el
  // primer render negro mientras cada imagen se descarga.
  useEffect(() => {
    const imageUrls = mediaList
      .filter((item) => item.type === 'image')
      .slice(0, 3)
      .map((item) => item.url)
      .filter(Boolean);
    if (imageUrls.length) {
      void Image.prefetch(imageUrls, 'memory-disk').catch(() => {});
    }
  }, [mediaList]);

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.notFound}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.notFoundText}>{t("loadingProperty")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!property) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t("propertyNotFound")}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t("back")}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const favorite = isFav(property.id);
  const returnColor = getReturnColor(property.returnRate);

  const currentPrice =
  Number(
    property.currentPrice ??
      property.precio_actual ??
      property.price ??
      property.precio ??
      0
  );

 const marketPrice =
  Number(
    property.marketPrice ??
      property.precio_mercado ??
      0
  );

 const surfaceM2 =
  Number(
    property.surfaceM2 ??
      property.superficie ??
      0
  );

 const constructionM2 =
  Number(
    property.constructionM2 ??
      property.construccion_m2 ??
      0
  );

 const priceUnit =
  property.priceUnit ??
  property.unidad_precio ??
  'm²';

 const title =
  property.title ??
  property.titulo ??
  'Propiedad';

 const location =
  property.location ??
  property.municipio ??
  property.ubicacion ??
  '';

 const surfaceUnit =
  property.surfaceUnit ??
  property.unidad_superficie ??
  'm²';

 const expectedPrice = Number(
  property.expectedPrice ??
    property.precio_esperado ??
    0
 );

 const frente = Number(property.frente ?? 0);
 const fondo = Number(property.fondo ?? 0);
 const hasDimensions = frente > 0 && fondo > 0;
 const terrainRatio = hasDimensions ? Math.min(3.2, Math.max(0.45, frente / fondo)) : 1;
 const hasCoordinates = Number.isFinite(Number(property.latitud)) && Number.isFinite(Number(property.longitud));

 const detailEntries = Object.entries(property.detalles || {})
  .filter(([_, value]) => value !== null && value !== undefined && String(value).trim() !== '');

 const characteristicEntries = Object.entries(property.caracteristicas || {})
  .filter(([_, value]) => value !== null && value !== undefined && String(value).trim() !== '');

 const nearbyServiceEntries = Object.entries(property.servicios_cercanos || {})
  .filter(([_, value]) => value !== null && value !== undefined && String(value).trim() !== '');

 const formatDynamicValue = (value: any) => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object' && value !== null) return Object.values(value).join(', ');
  return String(value);
 };

 const labelDynamicKey = (key: string) =>
  key
   .replace(/_/g, ' ')
   .replace(/\b\w/g, (letter) => letter.toUpperCase());

 const renderDynamicSection = (
  titleSection: string,
  entries: [string, any][],
 ) => {
  if (!entries.length) return null;

  return (
   <View style={styles.dataSection}>
    <Text style={styles.sectionTitle}>{titleSection}</Text>
    <View style={styles.dataGrid}>
     {entries.map(([key, value]) => (
      <View key={key} style={styles.dataCard}>
       <Text style={styles.dataLabel}>{labelDynamicKey(key)}</Text>
       <Text style={styles.dataValue}>{formatDynamicValue(value)}</Text>
      </View>
     ))}
    </View>
   </View>
  );
 };

  const handleWhatsApp = () => {
    if (property?.id) {
      void trackPropertyEvent(property.id, 'whatsapp_click', {
        property_title: title,
      });
      void registerProspectInterest(property.id, 'whatsapp', {
        property_title: title,
        channel: 'whatsapp',
      });
    }

    const msg = encodeURIComponent(
      `Hola, me interesa la propiedad: ${property.title || property.titulo} en ${property.location || property.municipio}. ¿Podría darme más información?`
    );
    Linking.openURL(`https://wa.me/${WHATSAPP}?text=${msg}`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${PHONE}`);
  };

  const handleShareProperty =
  async () => {
    try {
      if (property?.id) {
        void trackPropertyEvent(property.id, 'share');
      }
      const appLink =
        `https://www.eyesite.mx/property/${property.id}`;

      const message =
        `Mira esta propiedad en EYESITE: ${title} en ${location}. Precio: ${formatPrice(currentPrice, priceUnit)}. Descarga la app: https://www.eyesite.mx`;

      await Share.share({
        message,
        title:
          `Propiedad: ${title}`,
        url: appLink,
      });
    } catch (error) {
      console.error(
        'Error compartiendo:',
        error
      );
    }
  };

  const returnDiff = marketPrice > 0
    ? Math.round(((marketPrice - currentPrice) / marketPrice) * 100)
    : 0;

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(120, 96 + insets.bottom) }}>
        {/* Galería V6.3: orden fijo — portada (foto) → video (con poster) → resto. Sin negro. */}
        <View style={[styles.galleryContainer, { width: contentWidth, height: galleryHeight, alignSelf: 'center' }]}>
          <FlatList
            horizontal
            pagingEnabled
            data={mediaList}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / contentWidth);
              setActiveImage(index);
              setImageLoading(true);
            }}
            renderItem={({ item }) =>
              item.type === 'video' ? (
                videoPlaying ? (
                  <VideoView
                    player={carouselPlayer}
                    nativeControls
                    contentFit="contain"
                    style={{ width: contentWidth, height: galleryHeight, backgroundColor: '#000' }}
                  />
                ) : (
                  <Pressable
                    onPress={handleCarouselPlay}
                    style={{ width: contentWidth, height: galleryHeight, backgroundColor: '#000' }}
                  >
                    {item.poster ? (
                      <Image
                        source={{ uri: item.poster }}
                        style={StyleSheet.absoluteFill}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                    ) : null}
                    <View style={styles.carouselPlayBtn}>
                      <Text style={styles.carouselPlayIcon}>▶</Text>
                    </View>
                  </Pressable>
                )
              ) : (
                <View style={{ width: contentWidth, height: galleryHeight, backgroundColor: '#151515' }}>
                  <Image
                    source={{ uri: item.url }}
                    placeholder={item.url !== property.portada_url && property.portada_url ? { uri: property.portada_url } : undefined}
                    style={{ width: contentWidth, height: galleryHeight }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                    onLoadStart={() => {
                      if (mediaList[activeImage]?.url === item.url) setImageLoading(true);
                    }}
                    onLoad={() => {
                      if (mediaList[activeImage]?.url === item.url) setImageLoading(false);
                    }}
                  />
                  {mediaList[activeImage]?.url === item.url && imageLoading ? (
                    <View pointerEvents="none" style={styles.imageLoadingOverlay}>
                      <ActivityIndicator color="#C9A84C" size="large" />
                    </View>
                  ) : null}
                </View>
              )
            }
          />

          {/* Botón atrás */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { top: insets.top + 12 }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="chevron.left" size={20} color="#F5F5F5" />
          </Pressable>

          {/* Botón compartir */}
          <Pressable
            onPress={handleShareProperty}
            style={({ pressed }) => [styles.shareButton, { top: insets.top + 12 }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="paperplane.fill" size={20} color="#ffffff" />
          </Pressable>

          {/* Botón favorito */}
          <Pressable
            onPress={() => session ? toggleFav(property.id) : Alert.alert('Inicia sesión', 'Inicia sesión para guardar propiedades en favoritos.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Iniciar sesión', onPress: () => router.push('/(auth)/login' as never) }])}
            style={({ pressed }) => [styles.favoriteButton, { top: insets.top + 12 }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol
              name={favorite ? 'heart.fill' : 'heart'}
              size={22}
              color={favorite ? '#C9A84C' : '#ffffff'}
            />
          </Pressable>

          {/* Indicador de imágenes */}
          {mediaList.length > 1 && (
            <View style={styles.imageDots}>
              {mediaList.map((_, idx) => (
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
        <View style={[styles.content, { width: contentWidth, alignSelf: 'center' }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroHeaderTop}>
              <View style={styles.typeTag}>
                <Text style={styles.typeTagText}>{(property.type || property.tipo || 'PROPIEDAD').toUpperCase()}</Text>
              </View>
              {property.destacada ? (
                <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>DESTACADA</Text></View>
              ) : null}
            </View>
            <Text style={styles.title}>{property.title || property.titulo}</Text>
          <View style={styles.locationRow}>
            <IconSymbol name="location.fill" size={14} color="#C9A84C" />
            <Text style={styles.location}>{property.location || property.municipio}</Text>
          </View>

          <View style={styles.heroPriceRow}>
            <View style={styles.heroPriceBlock}>
              <Text style={styles.heroPriceLabel}>{t("currentPrice")}</Text>
              <Text style={styles.heroPrice}>{formatPrice(currentPrice, priceUnit)}</Text>
            </View>
            {marketPrice > 0 ? (
              <View style={styles.marketMiniCard}>
                <Text style={styles.marketMiniLabel}>{t("marketValue")}</Text>
                <Text style={styles.marketMiniValue}>{formatPrice(marketPrice, priceUnit)}</Text>
              </View>
            ) : null}
          </View>
          </View>

          <View style={styles.decisionGrid}>
            <View style={styles.decisionCard}><Text style={styles.decisionIcon}>▣</Text><Text style={styles.decisionLabel}>{t("surface")}</Text><Text style={styles.decisionValue}>{formatSurface(surfaceM2, surfaceUnit)}</Text></View>
            <View style={styles.decisionCard}><Text style={styles.decisionIcon}>↔</Text><Text style={styles.decisionLabel}>{t("front")}</Text><Text style={styles.decisionValue}>{frente > 0 ? `${frente} m` : "—"}</Text></View>
            <View style={styles.decisionCard}><Text style={styles.decisionIcon}>↕</Text><Text style={styles.decisionLabel}>{t("depth")}</Text><Text style={styles.decisionValue}>{fondo > 0 ? `${fondo} m` : "—"}</Text></View>
            <View style={styles.decisionCard}><Text style={styles.decisionIcon}>↗</Text><Text style={styles.decisionLabel}>{t("returnRate")}</Text><Text style={[styles.decisionValue, styles.decisionValueGold]}>+{property.returnRate}%</Text></View>
          </View>

          {/* Métricas secundarias */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("currentPrice")}</Text>
              <Text style={styles.metricValue}>
               {formatPrice(
                currentPrice,
                 priceUnit
                  )}
             </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("currentMarketPrice")}</Text>
              <Text style={[styles.metricValue, styles.metricValueMuted]}>
                {formatPrice(marketPrice, priceUnit)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("surface")}</Text>
              <Text style={styles.metricValue}>{formatSurface(surfaceM2, surfaceUnit)}</Text>
            </View>
            {constructionM2 > 0 && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t("construction")}</Text>
                <Text style={styles.metricValue}>{formatSurface(constructionM2, 'm²')}</Text>
              </View>
            )}
          </View>

          {/* Rendimiento destacado */}
          <View style={[styles.returnCard, { borderColor: returnColor + '55' }]}>
            <View>
              <Text style={styles.returnCardLabel}>{t("returnAtPurchase")}</Text>
              <Text style={styles.returnCardSub}>
                {returnDiff > 0 ? `${returnDiff}% ${t("belowMarket")}` : t("atMarketPrice")}
              </Text>
            </View>
            <Text style={[styles.returnCardValue, { color: returnColor }]}>
              +{property.returnRate}%
            </Text>
          </View>

          {/* Video del terreno: ahora vive en el carrusel (slide 2, V6.3) —
              el video se reproduce inline con poster, no como sección aparte */}

          {(hasDimensions || constructionM2 > 0) ? (
            <View style={styles.terrainSection}>
              <View style={styles.sectionHeadingRow}>
                <View>
                  <Text style={styles.sectionEyebrow}>{t("terrainAnalysis")}</Text>
                  <Text style={styles.sectionHeading}>{t("terrainShape")}</Text>
                </View>
                <Text style={styles.sectionHeadingHint}>{t("terrainVisualGuide")}</Text>
              </View>
              {hasDimensions ? (
                <View style={styles.terrainCard}>
                  <View style={styles.terrainDiagramWrap}>
                    <View style={[styles.terrainPlot, { aspectRatio: terrainRatio }]}>
                      <View style={styles.terrainPlotFill} />
                      <Text style={styles.terrainPlotLabel}>{formatSurface(surfaceM2, surfaceUnit)}</Text>
                      <Text style={styles.terrainFrontLabel}>{frente} m</Text>
                      <Text style={styles.terrainDepthLabel}>{fondo} m</Text>
                    </View>
                  </View>
                  <Text style={styles.terrainLegendText}>{t("terrainDimensionsHint")}</Text>
                </View>
              ) : null}
              {constructionM2 > 0 ? (
                <View style={styles.constructionInsight}>
                  <Text style={styles.constructionInsightTitle}>{t("construction")}</Text>
                  <Text style={styles.constructionInsightText}>{formatSurface(constructionM2, 'm²')} {t("constructionOnProperty")}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Descripción */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>{t("description")}</Text>
            <Text style={styles.descText}>{property.description || property.descripcion || t("noDescription")}</Text>
          </View>

          {property.descripcion_pro ? (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>{t("professionalInfo")}</Text>
              <Text style={styles.descText}>{property.descripcion_pro}</Text>
            </View>
          ) : null}

          {(property.direccion || property.ubicacion) && (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>{t("location")}</Text>
              {property.direccion ? <Text style={styles.descText}>{property.direccion}</Text> : null}
              {property.ubicacion && property.ubicacion !== location ? (
                <Text style={styles.secondaryText}>{property.ubicacion}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.metricsGrid}>
            {frente > 0 && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t("front")}</Text>
                <Text style={styles.metricValue}>{frente} m</Text>
              </View>
            )}
            {fondo > 0 && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t("depth")}</Text>
                <Text style={styles.metricValue}>{fondo} m</Text>
              </View>
            )}
            {expectedPrice > 0 && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t("expectedPrice")}</Text>
                <Text style={styles.metricValue}>{formatPrice(expectedPrice, priceUnit)}</Text>
              </View>
            )}
          </View>

          {hasCoordinates ? (
            <View style={styles.locationInsight}>
              <View style={styles.locationInsightIcon}><IconSymbol name="location.fill" size={18} color="#C9A84C" /></View>
              <View style={styles.locationInsightBody}>
                <Text style={styles.locationInsightTitle}>{t("mapLocationTitle")}</Text>
                <Text style={styles.locationInsightText}>{t("mapLocationDescription")}</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/map' as never)} style={styles.mapOpenButton}>
                <Text style={styles.mapOpenButtonText}>{t("openMap")}</Text>
              </Pressable>
            </View>
          ) : null}

          {renderDynamicSection(t("characteristics"), characteristicEntries)}
          {renderDynamicSection(t("details"), detailEntries)}
          {renderDynamicSection(t("nearbyServices"), nearbyServiceEntries)}

          {(property.estatus_legal || property.certeza_legal) ? (
            <View style={styles.legalNote}>
              <Text style={styles.legalIcon}>⚖️</Text>
              <View style={styles.legalContent}>
                <Text style={styles.legalTitle}>{t("legalStatus")}</Text>
                {property.estatus_legal ? (
                  <Text style={styles.legalText}>Estatus: {property.estatus_legal}</Text>
                ) : null}
                {property.certeza_legal ? (
                  <Text style={styles.legalText}>{t("legalCertainty")}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {property.tour_360 ? (
            <View style={styles.dataSection}>
              <Text style={styles.sectionTitle}>{t("tour360")}</Text>
              <Pressable
                onPress={() => Linking.openURL(property.tour_360 as string)}
                style={styles.linkCard}
              >
                <Text style={styles.linkLabel}>{t("openTour360")}</Text>
                <Text style={styles.linkUrl}>{property.tour_360}</Text>
              </Pressable>
            </View>
          ) : null}

          {privateDocumentPaths.length > 0 ? (
            <View style={styles.dataSection}>
              <Text style={styles.sectionTitle}>{t("documents")}</Text>
              {privateDocumentPaths.map((path) => {
                const name = path.split('/').pop() || 'Documento';
                const lower = name.toLowerCase();
                const type = lower.endsWith('.pdf') ? 'PDF' : (lower.endsWith('.kmz') || lower.endsWith('.kml')) ? 'MAPA' : 'ARCHIVO';
                return (
                  <Pressable key={path} onPress={() => void openPrivateDocument(path)} style={styles.linkCard} disabled={loadingDocument === path}>
                    <Text style={styles.linkLabel}>{type} · {name}</Text>
                    <Text style={styles.linkUrl}>{loadingDocument === path ? t("preparingDocument") : t("openDocument")}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {property.enlaces && Array.isArray(property.enlaces) && property.enlaces.length > 0 ? (
            <View style={styles.dataSection}>
              <Text style={styles.sectionTitle}>{t("links")}</Text>
              {property.enlaces.map((link: any, index: number) => {
                const url = typeof link === 'string' ? link : link?.url || link?.href;
                const label = typeof link === 'string' ? link : link?.label || link?.titulo || url;
                if (!url) return null;
                return (
                  <Pressable key={url || index} onPress={() => Linking.openURL(url)} style={styles.linkCard}>
                    <Text style={styles.linkLabel}>{label}</Text>
                    <Text style={styles.linkUrl}>{url}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

        </View>
      </ScrollView>

      {/* Botones de acción fijos */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(16, insets.bottom + 12) }]}>
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.8 }]}
        >
          <IconSymbol name="phone.fill" size={18} color="#C9A84C" />
          <Text style={styles.callBtnText}>{t("call")}</Text>
        </Pressable>
        <Pressable
          onPress={handleWhatsApp}
          style={({ pressed }) => [styles.whatsappBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.whatsappBtnText}>{t("scheduleCall")}</Text>
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
    width: '100%',
    height: 320,
  },
  galleryVideoContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#000',
  },
  galleryVideo: {
    width: '100%',
    height: '100%',
  },
  carouselPlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    borderColor: '#FFD60A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  carouselPlayIcon: {
    fontSize: 22,
    color: '#FFD60A',
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
  heroHeader: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
    marginBottom: 12,
  },
  heroHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C9A84C66',
    backgroundColor: '#C9A84C14',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  featuredBadgeText: {
    color: '#C9A84C',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  heroPriceBlock: { flex: 1 },
  heroPriceLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroPrice: {
    color: '#C9A84C',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  marketMiniCard: {
    minWidth: 128,
    backgroundColor: '#101010',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#252525',
  },
  marketMiniLabel: { color: '#777', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  marketMiniValue: { color: '#B7B7B7', fontSize: 12, fontWeight: '700', marginTop: 3 },
  decisionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  decisionCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 115,
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#282828',
  },
  decisionIcon: { color: '#C9A84C', fontSize: 17, marginBottom: 8 },
  decisionLabel: { color: '#777', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  decisionValue: { color: '#F5F5F5', fontSize: 14, fontWeight: '800' },
  decisionValueGold: { color: '#C9A84C' },
  terrainSection: { marginBottom: 22 },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 10,
  },
  sectionEyebrow: { color: '#C9A84C', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sectionHeading: { color: '#F5F5F5', fontSize: 18, fontWeight: '800', marginTop: 2 },
  sectionHeadingHint: { flex: 1, color: '#666', fontSize: 10, textAlign: 'right', lineHeight: 15 },
  terrainCard: {
    backgroundColor: '#151515',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
  },
  terrainDiagramWrap: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  terrainPlot: {
    width: '70%',
    maxWidth: 360,
    minHeight: 105,
    borderWidth: 2,
    borderColor: '#C9A84C',
    borderRadius: 6,
    backgroundColor: '#C9A84C08',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  terrainPlotFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C9A84C0D',
  },
  terrainPlotLabel: { color: '#C9A84C', fontSize: 16, fontWeight: '900' },
  terrainFrontLabel: { position: 'absolute', top: -23, color: '#F5F5F5', fontSize: 11, fontWeight: '700' },
  terrainDepthLabel: { position: 'absolute', right: -42, color: '#F5F5F5', fontSize: 11, fontWeight: '700' },
  terrainLegendText: { color: '#8A8A8A', fontSize: 11, lineHeight: 16, marginTop: 6 },
  constructionInsight: {
    marginTop: 9,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#252525',
  },
  constructionInsightTitle: { color: '#C9A84C', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  constructionInsightText: { color: '#BDBDBD', fontSize: 12, lineHeight: 18, marginTop: 3 },
  locationInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#151515',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginBottom: 20,
  },
  locationInsightIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C9A84C14',
  },
  locationInsightBody: { flex: 1 },
  locationInsightTitle: { color: '#F5F5F5', fontSize: 12, fontWeight: '800' },
  locationInsightText: { color: '#777', fontSize: 10, lineHeight: 15, marginTop: 2 },
  mapOpenButton: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#C9A84C',
  },
  mapOpenButtonText: { color: '#0D0D0D', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  content: {
    maxWidth: 1200,
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
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
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
  secondaryText: {
    color: '#9A9A9A',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  dataSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#9A9A9A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dataCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  dataLabel: {
    color: '#9A9A9A',
    fontSize: 11,
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  dataValue: {
    color: '#F5F5F5',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  linkCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 8,
  },
  linkLabel: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  linkUrl: {
    color: '#9A9A9A',
    fontSize: 12,
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
    width: '94%',
    maxWidth: 1000,
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
