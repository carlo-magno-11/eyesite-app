import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PROPERTY_TYPES_OPTIONS } from '@/lib/properties-data';
import { PropertyCard } from '@/components/property-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useProperties } from '@/hooks/use-properties';

export default function PropertiesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const { properties, loading, error } = useProperties();

  useEffect(() => {
    if (params.filter) {
      setActiveFilter(params.filter);
    }
  }, [params.filter]);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const matchesType = activeFilter === 'all' || (p.type || p.tipo || '').toLowerCase() === activeFilter.toLowerCase();
      const matchesSearch =
        search.trim() === '' ||
        (p.title || p.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.location || p.municipio || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.municipality || p.municipio || '').toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [search, activeFilter, properties]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>OPORTUNIDADES</Text>
        <Text style={styles.headerCount}>{filtered.length} propiedades</Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={16} color="#9A9A9A" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o ubicación..."
            placeholderTextColor="#9A9A9A"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <IconSymbol name="xmark" size={16} color="#9A9A9A" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={PROPERTY_TYPES_OPTIONS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActiveFilter(item.key)}
              style={({ pressed }) => [
                styles.filterChip,
                activeFilter === item.key && styles.filterChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Lista de propiedades */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.loadingText}>Cargando propiedades...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <PropertyCard property={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyText}>
                {error
                  ? `Error: ${error}`
                  : 'No encontramos propiedades con esos criterios. Intenta con otra búsqueda o filtro.'}
              </Text>
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
    paddingBottom: 12,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 14,
  },
  filtersWrapper: {
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  filterChipActive: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  filterText: {
    color: '#9A9A9A',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0D0D0D',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: '#9A9A9A',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9A9A9A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});