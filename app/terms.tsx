import { useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ScreenContainer } from '@/components/screen-container';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/lib/i18n';

const TERMS_ITEMS = [
  { key: 'servicio', labelKey: 'termServiceLabel' as const },
  { key: 'privacidad', labelKey: 'termPrivacyLabel' as const },
  { key: 'datos', labelKey: 'termDataLabel' as const },
];

export default function TermsScreen() {
  const { user } = useAuth();
  const { isDesktop, horizontalPadding, contentMaxWidth } = useResponsive();
  const { t } = useI18n();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [leido, setLeido] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allAccepted = TERMS_ITEMS.every((t) => accepted[t.key] && leido[t.key]);

  const abrirModal = (key: string) => setModal(key);

  const confirmarLectura = () => {
    if (!modal) return;
    setLeido(prev => ({...prev, [modal]: true }));
    setAccepted(prev => ({...prev, [modal]: true }));
    setModal(null);
  };

  const toggle = (key: string, value: boolean) => {
    if (value &&!leido[key]) {
      abrirModal(key); // si no ha leído, lo obliga a leer
      return;
    }
    setAccepted((prev) => ({...prev, [key]: value }));
  };

  const onAccept = async () => {
  if (!allAccepted || saving || !user?.id) return;

  setSaving(true);

  try {
    const payload = {
      terminos_aceptados: true,
      terminos_fecha: new Date().toISOString(),
      terminos_version: 'v1.0',
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    if (updateError) {
      console.error('[terms] update falló:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
      throw updateError;
    }

    // Volvemos a consultar el perfil para obtener el estado actualizado.
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('estado, terminos_aceptados')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[terms] consulta de perfil falló:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
      throw profileError;
    }

    if (!updatedProfile?.terminos_aceptados) {
      throw new Error('Los términos no quedaron guardados correctamente.');
    }

    if (updatedProfile.estado === 'pendiente') {
      router.replace('/pending');
    } else {
      router.replace('/(tabs)');
    }
  } catch (e: any) {
    console.error('[terms] ERROR REAL:', {
      code: e?.code,
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
    });

    Alert.alert(
      t("termsSaveError"),
      e?.message || t("termsSaveErrorDescription"),
    );
  } finally {
    setSaving(false);
  }
};

  return (
    <ScreenContainer edges={['top', 'bottom']} containerClassName="bg-background">
      <ScrollView contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}>\n        <View style={[styles.content, isDesktop && { maxWidth: contentMaxWidth ?? 900 }]}>
        <Text style={styles.title}>{t("termsTitle")}</Text>
        <Text style={styles.subtitle}>{t("termsSubtitle")}</Text>

        <View style={styles.card}>
          {TERMS_ITEMS.map((item) => (
            <View key={item.key} style={styles.row}>
              <Pressable onPress={() => abrirModal(item.key)} style={{flex:1}}>
                <Text style={styles.label}>
                  {t(item.labelKey)}
                  {!leido[item.key] && <Text style={{color:'#C9A84C'}}> ({t("readInfo")})</Text>}
                </Text>
              </Pressable>
              <Switch
                value={!!accepted[item.key]}
                onValueChange={(v) => toggle(item.key, v)}
                trackColor={{ false: '#333333', true: '#C9A84C' }}
                thumbColor={accepted[item.key]? '#FFFFFF' : '#888888'}
              />
            </View>
          ))}
        </View>

        <Pressable
          onPress={onAccept}
          disabled={!allAccepted || saving}
          style={({ pressed }) => [styles.btn, (!allAccepted || saving) && styles.btnDisabled, pressed && allAccepted && { opacity: 0.85 }]}
        >
          {saving? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.btnText}>{t("acceptContinue")}</Text>}
        </Pressable>
        <Text style={styles.hint}>{allAccepted ? t("termsHintAccepted") : t("termsHintPending")}</Text>

        {/* MODAL DE LECTURA */}
        <Modal visible={!!modal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {modal === 'servicio' ? t("termServiceTitle") : modal === 'privacidad' ? t("termPrivacyTitle") : t("termDataTitle")}
              </Text>
              <ScrollView style={{maxHeight:380, marginVertical:12}}>
                <Text style={styles.modalText}>{modal === 'servicio' ? t("termsServiceText") : modal === 'privacidad' ? t("termsPrivacyText") : t("termsDataText")}</Text>
              </ScrollView>
              <Pressable onPress={confirmarLectura} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>{t("readAndConfirm")}</Text>
              </Pressable>
              <Pressable onPress={()=>setModal(null)} style={{padding:12, alignItems:'center'}}>
                <Text style={{color:'#888'}}>{t("closeWithoutAccepting")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  content: { width: '100%', alignSelf: 'center' },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  subtitle: { color: '#9A9A9A', fontSize: 13, marginBottom: 20 },
  card: { backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: '#C9A84C', borderRadius: 12, padding: 16, marginBottom: 20, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2A2A2A' },
  label: { color: '#F5F2EC', fontSize: 14, flex: 1, paddingRight: 12, lineHeight: 20 },
  btn: { backgroundColor: '#C9A84C', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#3A3A3A' },
  btnText: { color: '#0D0D0D', fontWeight: '800', letterSpacing: 1 },
  hint: { color: '#C9A84C', fontSize: 12, textAlign: 'center', marginTop: 12 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'flex-end' },
  modalContent: { backgroundColor:'#1A1A1A', borderTopLeftRadius:20, borderTopRightRadius:20, padding:24, borderWidth:1, borderColor:'#C9A84C' },
  modalTitle: { color:'#C9A84C', fontSize:18, fontWeight:'bold' },
  modalText: { color:'white', lineHeight:22, fontSize:14 },
  modalBtn: { backgroundColor:'#C9A84C', padding:16, borderRadius:10, alignItems:'center', marginTop:12 },
  modalBtnText: { color:'#0D0D0E', fontWeight:'bold', textAlign:'center' },
});