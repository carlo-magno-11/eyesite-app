import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/hooks/useAuth';
import { useSavedSearches } from '@/hooks/use-commercial';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/lib/i18n';

export default function SavedSearchesScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useI18n();
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
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>

        <Text style={styles.eyebrow}>{t("commercial")}</Text>
        <Text style={styles.title}>{t("savedSearches")}</Text>
        <Text style={styles.subtitle}>
          {t("savedSearchesSubtitle")}
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#C9A84C" size="large" />
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error || t("savedSearchesError")}</Text>
          </View>
        ) : searches.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>{t("noSavedSearches")}</Text>
            <Text style={styles.emptyText}>
              {t("savedSearchesEmptyDescription")}
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/properties' as never)} style={styles.primary}>
              <Text style={styles.primaryText}>{t("viewOpportunities")}</Text>
            </Pressable>
          </View>
        ) : (
          searches.map((search) => (
            <View key={search.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.cardTitle}>{search.nombre}</Text>
                  <Text style={styles.cardMeta}>
                    {(search.tipo ? t("typeLabel") + ': ' + search.tipo : t("allTypes")) +
                      (search.municipio ? ' · ' + search.municipio : '')}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {[
                      search.min_price != null ? `${t("from")} ${Number(search.min_price).toLocaleString(language === "en" ? "en-US" : "es-MX")}` : '',
                      search.max_price != null ? `${t("to")} ${Number(search.max_price).toLocaleString(language === "en" ? "en-US" : "es-MX")}` : '',
                      search.min_surface != null ? `${t("from")} ${Number(search.min_surface).toLocaleString(language === "en" ? "en-US" : "es-MX")} m²` : '',
                      search.max_surface != null ? `${t("to")} ${Number(search.max_surface).toLocaleString(language === "en" ? "en-US" : "es-MX")} m²` : '',
                    ].filter(Boolean).join(' · ') || t("noPriceSurfaceLimits")}
                  </Text>
                </View>
                <View style={[styles.status, !search.activa && styles.statusOff]}>
                  <Text style={styles.statusText}>{search.activa ? t("active") : t("paused")}</Text>
                </View>
              </View>

              <Pressable
                onPress={() =>
                  Alert.alert(
                    t("deleteSearch"),
                    t("deleteSearchConfirm"),
                    [
                      { text: t("cancel"), style: "cancel" },
                      {
                        text: t("deleteSearch"),
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await remove(search.id);
                          } catch (e: any) {
                            Alert.alert(t("couldNotDelete"), e?.message || t("tryAgainShort"));
                          }
                        },
                      },
                    ],
                  )
                }
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>{t("deleteSearch")}</Text>
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
