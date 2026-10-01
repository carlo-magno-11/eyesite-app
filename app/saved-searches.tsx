import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { useSavedSearches } from '@/hooks/use-commercial';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/lib/i18n';

export default function SavedSearchesScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useI18n();
  const { searches, loading, error, remove } = useSavedSearches(user?.id);
  const { contentMaxWidth, horizontalPadding } = useResponsive();
  const [pendingDelete, setPendingDelete] = useState<SavedSearch | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

        {deleteError ? <View style={styles.card}><Text style={styles.error}>{deleteError}</Text></View> : null}

        {loading ?
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
                onPress={() => { setDeleteError(null); setPendingDelete(search); }}
                disabled={deletingId === search.id}
                accessibilityRole="button"
                accessibilityLabel={t("deleteSearch")}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed, deletingId === search.id && styles.disabled]}
              >
                {deletingId === search.id ? <ActivityIndicator color="#E57373" size="small" /> : <Text style={styles.deleteText}>{t("deleteSearch")}</Text>}
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
      <Modal visible={Boolean(pendingDelete)} transparent animationType="fade" onRequestClose={() => deletingId ? undefined : setPendingDelete(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>{t("deleteSearch")}</Text>
            <Text style={styles.modalTitle}>{t("deleteSearchConfirm")}</Text>
            {pendingDelete && <Text style={styles.modalName}>{pendingDelete.nombre}</Text>}
            <Text style={styles.modalHint}>{t("savedSearchesSubtitle")}</Text>
            <View style={styles.modalActions}>
              <Pressable disabled={Boolean(deletingId)} onPress={() => setPendingDelete(null)} style={styles.cancelButton}><Text style={styles.cancelText}>{t("cancel")}</Text></Pressable>
              <Pressable disabled={Boolean(deletingId)} onPress={async () => { if (!pendingDelete) return; setDeletingId(pendingDelete.id); try { await remove(pendingDelete.id); setPendingDelete(null); } catch (e: any) { setDeleteError(e?.message || t("tryAgainShort")); } finally { setDeletingId(null); } }} style={styles.confirmDeleteButton}><Text style={styles.confirmDeleteText}>{t("deleteSearch")}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
  deleteButton: { marginTop: 14, alignSelf: 'flex-end', minWidth: 90, minHeight: 28, alignItems: 'flex-end', justifyContent: 'center' },
  deleteText: { color: '#E57373', fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#171717', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 18, padding: 22 },
  modalEyebrow: { color: '#C9A84C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  modalTitle: { color: '#F5F5F5', fontSize: 18, fontWeight: '800', marginTop: 7, lineHeight: 24 },
  modalName: { color: '#C9A84C', fontSize: 14, fontWeight: '800', marginTop: 12 },
  modalHint: { color: '#888', fontSize: 12, lineHeight: 18, marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#BDBDBD', fontSize: 12, fontWeight: '800' },
  confirmDeleteButton: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: '#E57373', alignItems: 'center', justifyContent: 'center' },
  confirmDeleteText: { color: '#0D0D0D', fontSize: 12, fontWeight: '900' },
});
