import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { PropertyCard } from '@/components/property-card';
import { useFavorites } from '@/hooks/use-favorites';
import { useProperties } from '@/hooks/use-properties';

export default function FavoritesScreen() {
  const { favs } = useFavorites();
  const { properties, loading: propsLoading, refetch: fetchProperties } = useProperties();

  const favoriteProperties = properties.filter((p) => favs.includes(p.id));
  const loading = propsLoading;

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <View style={styles.header}>
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
          data={favoriteProperties}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchProperties}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <PropertyCard property={item} />}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerCount: {
    color: '#9A9A9A',
    fontSize: 13,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    color: '#9A9A9A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyHint: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
});