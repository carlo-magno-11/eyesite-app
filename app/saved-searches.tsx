import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/hooks/useAuth';
import { useSavedSearches } from '@/hooks/use-commercial';
import { useResponsive } from '@/hooks/use-responsive';

export default function SavedSearchesScreen() {
  const { user, loading: authLoading } = useAuth();
  const { searches, loading, error, remove } = useSavedSearches(user?.id);
  const { contentMaxWidth, horizontalPadding } = useResponsive();

  if (authLoading || !user) return null;

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Volver</Text>
        </Pressable>

        <Text style={styles.eyebrow}>EYESITE COMERCIAL</Text>
        <Text style={styles.title}>Mis búsquedas</Text>
        <Text style={styles.subtitle}>
          Guarda tus criterios para que EYESITE pueda avisarte cuando aparezcan nuevas oportunidades compatibles.
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#C9A84C" size="large" />
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : searches.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Aún no tienes búsquedas guardadas.</Text>
            <Text style={styles.emptyText}>
              Ve a Oportunidades, aplica una búsqueda y toca “Guardar esta búsqueda”.
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/properties' as never)} style={styles.primary}>
              <Text style={styles.primaryText}>VER OPORTUNIDADES</Text>
            </Pressable>
          </View>
        ) : (
          searches.map((search) => (
            <View key={search.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.cardTitle}>{search.nombre}</Text>
                  <Text style={styles.cardMeta}>
                    {(search.tipo ? 'Tipo: ' + search.tipo : 'Todos los tipos') +
                      (search.municipio ? ' · ' + search.municipio : '')}
                  </Text>
                </View>
                <View style={[styles.status, !search.activa && styles.statusOff]}>
                  <Text style={styles.statusText}>{search.activa ? 'ACTIVA' : 'PAUSADA'}</Text>
                </View>
              </View>

              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Eliminar búsqueda',
                    '¿Quieres eliminar esta búsqueda guardada?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await remove(search.id);
                          } catch (e: any) {
                            Alert.alert('No se pudo eliminar', e?.message || 'Inténtalo nuevamente.');
                          }
                        },
                      },
                    ],
                  )
                }
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>Eliminar</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignSelf: 'center', paddingTop: 20, paddingBottom: 120 },
  back: { marginBottom: 20 },
  backText: { color: '#C9A84C', fontSize: 14, fontWeight: '700' },
  eyebrow: { color: '#C9A84C', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#F5F5F5', fontSize: 28, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#888', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 22 },
  center: { paddingVertical: 80, alignItems: 'center' },
  card: { backgroundColor: '#171717', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, padding: 15, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1 },
  cardTitle: { color: '#F5F5F5', fontSize: 14, fontWeight: '800' },
  cardMeta: { color: '#888', fontSize: 11, marginTop: 5 },
  status: { borderWidth: 1, borderColor: '#4CAF7A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusOff: { borderColor: '#666' },
  statusText: { color: '#9ED7B6', fontSize: 9, fontWeight: '900' },
  emptyTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#888', fontSize: 13, lineHeight: 20, marginTop: 8 },
  error: { color: '#E57373', fontSize: 13 },
  primary: { backgroundColor: '#C9A84C', borderRadius: 9, padding: 13, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#0D0D0D', fontSize: 12, fontWeight: '900' },
  deleteButton: { marginTop: 14, alignSelf: 'flex-end' },
  deleteText: { color: '#E57373', fontSize: 12, fontWeight: '800' },
});
