import { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PROPERTY_TYPES_OPTIONS } from '@/lib/properties-data';
import { PropertyCard } from '@/components/property-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useProperties } from '@/hooks/use-properties';
import { useResponsive } from '@/hooks/use-responsive';
import { useAuth } from '@/hooks/useAuth';
import { useSavedSearches } from '@/hooks/use-commercial';

export default function PropertiesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [search, setSearch] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSurface, setMinSurface] = useState('');
  const [maxSurface, setMaxSurface] = useState('');
  const initialFilter = typeof params.filter === 'string' && params.filter ? params.filter : 'all';
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const { properties, loading, error, refetch: fetchProperties } = useProperties();
  const { propertyColumns, horizontalPadding, contentMaxWidth, isDesktop } = useResponsive();
  const { user } = useAuth();
  const { save } = useSavedSearches(user?.id);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const matchesType = activeFilter === 'all' || (p.type || p.tipo || '').toLowerCase() === activeFilter.toLowerCase();
      const matchesSearch =
        search.trim() === '' ||
        (p.title || p.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.location || p.municipio || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.municipality || p.municipio || '').toLowerCase().includes(search.toLowerCase());
      const price = Number(p.currentPrice ?? p.precio_actual ?? p.precio ?? 0) || 0;
      const surface = Number(p.surfaceM2 ?? p.superficie ?? 0) || 0;
      const wantedMunicipio = municipio.trim().toLowerCase();
      const actualMunicipio = String(p.municipality ?? p.municipio ?? p.location ?? '').toLowerCase();
      const matchesMunicipio = !wantedMunicipio || actualMunicipio.includes(wantedMunicipio);
      const matchesMinPrice = !minPrice || price >= Number(minPrice);
      const matchesMaxPrice = !maxPrice || price <= Number(maxPrice);
      const matchesMinSurface = !minSurface || surface >= Number(minSurface);
      const matchesMaxSurface = !maxSurface || surface <= Number(maxSurface);
      return matchesType && matchesSearch && matchesMunicipio && matchesMinPrice && matchesMaxPrice && matchesMinSurface && matchesMaxSurface;
    });
  }, [search, activeFilter, properties]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.content, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.contentCentered]}>
        <View style={styles.header}>
        <Text style={styles.headerTitle}>OPORTUNIDADES</Text>
        <Text style={styles.headerCount}>{filtered.length} propiedades</Text>
      </View>

        </View>

      {/* Barra de búsqueda */}
      <View style={[styles.searchContainer, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.contentCentered]}>
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

      <View style={[styles.advancedFilters, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.contentCentered]}>
        <TextInput style={styles.filterInput} placeholder="Zona / municipio" placeholderTextColor="#777" value={municipio} onChangeText={setMunicipio} />
        <TextInput style={styles.filterInput} placeholder="Precio mínimo" placeholderTextColor="#777" value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" />
        <TextInput style={styles.filterInput} placeholder="Precio máximo" placeholderTextColor="#777" value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" />
        <TextInput style={styles.filterInput} placeholder="Superficie mínima m²" placeholderTextColor="#777" value={minSurface} onChangeText={setMinSurface} keyboardType="numeric" />
        <TextInput style={styles.filterInput} placeholder="Superficie máxima m²" placeholderTextColor="#777" value={maxSurface} onChangeText={setMaxSurface} keyboardType="numeric" />
      </View>

      {/* Filtros */}
      <View style={[styles.filtersWrapper, { maxWidth: contentMaxWidth }, isDesktop && styles.contentCentered]}>
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

      <View style={[styles.savedSearchRow, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.contentCentered]}>
        <Pressable
          onPress={async () => {
            if (!user) {
              Alert.alert('Inicia sesión', 'Necesitas una sesión activa para guardar una búsqueda.');
              return;
            }

            try {
              await save({
                nombre: search.trim()
                  ? `Búsqueda: ${search.trim()}`
                  : activeFilter === 'all'
                    ? 'Todas las propiedades'
                    : `Propiedades: ${activeFilter}`,
                min_price: minPrice ? Number(minPrice) : null,
                max_price: maxPrice ? Number(maxPrice) : null,
                min_surface: minSurface ? Number(minSurface) : null,
                max_surface: maxSurface ? Number(maxSurface) : null,
                municipio: municipio.trim() || null,
                tipo: activeFilter === 'all' ? null : activeFilter,
                objetivo: null,
                plazo_compra: null,
                financiamiento: null,
                activa: true,
              });
              Alert.alert('Búsqueda guardada', 'EYESITE te avisará cuando podamos encontrar nuevas coincidencias.');
            } catch (error: any) {
              Alert.alert('No se pudo guardar', error?.message || 'Inténtalo nuevamente.');
            }
          }}
          style={({ pressed }) => [styles.savedSearchButton, pressed && { opacity: 0.78 }]}
        >
          <Text style={styles.savedSearchIcon}>🔔</Text>
          <View style={styles.savedSearchCopy}>
            <Text style={styles.savedSearchTitle}>GUARDAR ESTA BÚSQUEDA</Text>
            <Text style={styles.savedSearchText}>Recibe alertas de nuevas propiedades compatibles.</Text>
          </View>
        </Pressable>
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
          refreshing={loading}
          onRefresh={fetchProperties}
          key={`properties-grid-${propertyColumns}`}
          numColumns={propertyColumns}
          columnWrapperStyle={propertyColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={[styles.listContainer, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }, isDesktop && styles.contentCentered]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <View
              style={[
                propertyColumns > 1 ? styles.gridItem : styles.singleItem,
                propertyColumns === 2 && styles.gridItemTwo,
                propertyColumns === 3 && styles.gridItemThree,
                propertyColumns === 4 && styles.gridItemFour,
              ]}
            >
              <PropertyCard property={item} />
            </View>}
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
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  contentCentered: {
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: "#F5F5F5",
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerCount: {
    color: "#9A9A9A",
    fontSize: 13,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#141414",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 14,
  },
  advancedFilters: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  filterInput: {
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: '#141414',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    color: '#F5F5F5',
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 12,
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
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  gridItem: {
    minWidth: 0,
  },
  gridItemTwo: {
    width: '48.5%',
  },
  gridItemThree: {
    width: '31.5%',
  },
  gridItemFour: {
    width: '23.5%',
  },
  singleItem: {
    width: '100%',
  },
  savedSearchRow: {
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 10,
  },
  savedSearchButton: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 10,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedSearchIcon: {
    fontSize: 18,
  },
  savedSearchCopy: {
    flex: 1,
  },
  savedSearchTitle: {
    color: '#C9A84C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  savedSearchText: {
    color: '#888',
    fontSize: 11,
    marginTop: 3,
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