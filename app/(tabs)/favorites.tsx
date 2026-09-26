import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { PropertyCard } from '@/components/property-card';
import { useFavorites } from '@/hooks/use-favorites';
import { mapProperty } from '@/hooks/use-properties';
import { supabase } from '@/lib/supabase';
import { useResponsive } from '@/hooks/use-responsive';
import type { Property } from '@/lib/properties-data';

const FAVORITES_FIELDS = [
  'id','codigo','titulo','tipo','municipio','ubicacion','direccion',
  'superficie','unidad_superficie','precio_actual','precio_mercado',
  'precio','precio_esperado','unidad_precio','rendimiento','moneda',
  'destacada','fotos','portada_url','portada_tipo','tipo_portada',
  'video_url','activa','estado','orden','created_at','updated_at',
  'latitud','longitud',
].join(',');

export default function FavoritesScreen() {
  const { favs } = useFavorites();
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { propertyColumns, horizontalPadding, contentMaxWidth } = useResponsive();

  const fetchFavoriteProperties = useCallback(async () => {
    if (!favs.length) {
      setFavoriteProperties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('propiedades_publicas')
      .select(FAVORITES_FIELDS)
      .eq('estado', 'activa')
      .in('id', favs);
    if (error) {
      console.warn('[favorites] properties load:', error.message);
      setFavoriteProperties([]);
    } else {
      const byId = new Map(favs.map((id, index) => [id, index]));
      const mapped = (data ?? []).map(mapProperty).sort((a, b) => (byId.get(a.id) ?? 0) - (byId.get(b.id) ?? 0));
      setFavoriteProperties(mapped);
    }
    setLoading(false);
  }, [favs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchFavoriteProperties();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchFavoriteProperties]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}>
        <Text style={styles.headerTitle}>FAVORITOS</Text>
        <Text style={styles.headerCount}>{favoriteProperties.length} guardadas</Text>
      </View>

      {loading && favoriteProperties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.emptyText}>Cargando favoritos...</Text>
        </View>
      ) : (
        <FlatList
          key={`favorites-grid-${propertyColumns}`}
          data={favoriteProperties}
          keyExtractor={(item) => item.id}
          numColumns={propertyColumns}
          refreshing={loading}
          onRefresh={fetchFavoriteProperties}
          columnWrapperStyle={propertyColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={[styles.listContainer, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={propertyColumns > 1 ? styles.gridItem : styles.singleItem}>
              <PropertyCard property={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏡</Text>
              <Text style={styles.emptyTitle}>Sin favoritos aún</Text>
              <Text style={styles.emptyText}>
                Guarda las propiedades que más te interesen tocando el ícono de corazón en cada propiedad.
              </Text>
              <Text style={styles.emptyHint}>FIND YOUR LEGACY</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#F5F5F5', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  headerCount: { color: '#9A9A9A', fontSize: 13 },
  listContainer: { paddingBottom: 100 },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
    justifyContent: 'center',
    width: '100%',
  },
  gridItem: {
    flex: 1,
    minWidth: 0,
    maxWidth: 430,
  },
  singleItem: { width: '100%', marginBottom: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { color: '#F5F5F5', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#9A9A9A', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyHint: { color: '#C9A84C', fontSize: 12, fontWeight: '700', letterSpacing: 3 },
});
