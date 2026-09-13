import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { ScreenContainer } from '@/components/screen-container';
import { useProperties } from '@/hooks/use-properties';
import { formatPrice } from '@/lib/properties-data';

const DEFAULT_REGION: Region = {
  latitude: 20.9674,
  longitude: -89.5926,
  latitudeDelta: 0.8,
  longitudeDelta: 0.8,
};

const RADIUS_OPTIONS = [10, 25, 50, 100] as const;

type UserCoords = { latitude: number; longitude: number };

function distanceKm(a: UserCoords, b: UserCoords) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function MapScreen() {
  const { properties, loading } = useProperties();
  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [radius, setRadius] = useState<number>(25);
  const [locating, setLocating] = useState(false);

  const requestLocation = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Ubicación', 'La ubicación del dispositivo se usa en la aplicación móvil.');
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert('Permiso de ubicación', 'Activa el permiso de ubicación para encontrar propiedades cerca de ti.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setUserLocation(coords);
      setRegion({ ...coords, latitudeDelta: 0.25, longitudeDelta: 0.25 });
    } catch (error) {
      console.error('[map] location error', error);
      Alert.alert('Ubicación', 'No pudimos obtener tu ubicación. Puedes mover el mapa manualmente.');
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void requestLocation();
    }, 0);

    return () => clearTimeout(timer);
  }, [requestLocation]);

  const geoProperties = useMemo(() => properties.filter((p: any) => {
    const lat = Number(p.latitud ?? p.latitude);
    const lng = Number(p.longitud ?? p.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }), [properties]);

  const nearby = useMemo(() => {
    if (!userLocation) return geoProperties;
    return geoProperties
      .map((property: any) => ({ property, distance: distanceKm(userLocation, { latitude: Number(property.latitud), longitude: Number(property.longitud) }) }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [geoProperties, radius, userLocation]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>TERRENOS EYESITE CERCA DE TI</Text>
          <Text style={styles.subtitle}>
            {userLocation ? `${nearby.length} oportunidades en ${radius} km` : `${geoProperties.length} propiedades con ubicación`}
          </Text>
        </View>
        <Pressable onPress={requestLocation} style={styles.locationButton} disabled={locating}>
          {locating ? <ActivityIndicator size="small" color="#0D0D0D" /> : <Text style={styles.locationButtonText}>⌖</Text>}
        </Pressable>
      </View>

      <View style={styles.radiusRow}>
        {RADIUS_OPTIONS.map((value) => (
          <Pressable key={value} onPress={() => setRadius(value)} style={[styles.radiusChip, radius === value && styles.radiusChipActive]}>
            <Text style={[styles.radiusText, radius === value && styles.radiusTextActive]}>{value} km</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={DEFAULT_REGION}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
          showsCompass
        >
          {nearby.map((item: any) => {
            const property = item.property ?? item;
            const distance = item.distance as number | undefined;
            const latitude = Number(property.latitud);
            const longitude = Number(property.longitud);
            return (
              <Marker
                key={property.id}
                coordinate={{ latitude, longitude }}
                title={property.title || property.titulo || 'Propiedad'}
                description={`${distance != null ? `${distance.toFixed(1)} km · ` : ''}${formatPrice(property.currentPrice || property.precio_actual || 0, property.priceUnit || property.unidad_precio || 'MXN')}`}
                onCalloutPress={() => router.push(`/property/${property.id}` as any)}
              />
            );
          })}
        </MapView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#C9A84C" size="large" />
          </View>
        )}

        {!loading && geoProperties.length === 0 && (
          <View style={styles.emptyOverlay}>
            <Text style={styles.emptyTitle}>Aún no hay propiedades ubicadas</Text>
            <Text style={styles.emptyText}>Solo aparecen propiedades EYESITE activas y publicadas por administración que tengan coordenadas verificadas.</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>{userLocation ? 'Más cercanas' : 'Propiedades ubicadas'}</Text>
        <Text style={styles.footerNote}>Solo propiedades EYESITE publicadas y activas.</Text>
        {nearby.slice(0, 4).map((item: any) => {
          const property = item.property ?? item;
          const distance = item.distance as number | undefined;
          return (
          <Pressable key={property.id} style={styles.resultRow} onPress={() => router.push(`/property/${property.id}` as any)}>
            <View style={styles.pin}><Text>⌖</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle} numberOfLines={1}>{property.title || property.titulo}</Text>
              <Text style={styles.resultMeta}>{property.municipio || property.location || 'Yucatán'}{userLocation && distance != null ? ` · ${distance.toFixed(1)} km` : ''}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { color: '#F5F5F5', fontSize: 17, fontWeight: '800', letterSpacing: 1.2 },
  subtitle: { color: '#9A9A9A', fontSize: 12, marginTop: 4 },
  locationButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center' },
  locationButtonText: { color: '#0D0D0D', fontSize: 23, fontWeight: '900' },
  radiusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 10 },
  radiusChip: { borderWidth: 1, borderColor: '#303030', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#181818' },
  radiusChipActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  radiusText: { color: '#B8B8B8', fontSize: 12, fontWeight: '700' },
  radiusTextActive: { color: '#0D0D0D' },
  mapWrap: { flex: 1, minHeight: 360, marginHorizontal: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2A2A2A' },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,13,13,.45)' },
  emptyOverlay: { position: 'absolute', left: 24, right: 24, bottom: 24, padding: 16, borderRadius: 12, backgroundColor: 'rgba(13,13,13,.9)', borderWidth: 1, borderColor: '#C9A84C' },
  emptyTitle: { color: '#F5F5F5', fontWeight: '800', marginBottom: 5 },
  emptyText: { color: '#B8B8B8', fontSize: 12, lineHeight: 17 },
  footer: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  footerTitle: { color: '#F5F5F5', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  footerNote: { color: '#777777', fontSize: 10, marginBottom: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  pin: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1D1D1D', alignItems: 'center', justifyContent: 'center' },
  resultTitle: { color: '#F5F5F5', fontSize: 13, fontWeight: '700' },
  resultMeta: { color: '#8E8E8E', fontSize: 11, marginTop: 2 },
  arrow: { color: '#C9A84C', fontSize: 24 },
});
