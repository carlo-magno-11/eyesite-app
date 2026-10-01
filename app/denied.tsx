import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useResponsive } from '@/hooks/use-responsive';
import { CONTACT } from '@/constants/contact';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';

const DEFAULT_PHONE = CONTACT.whatsappNumber;

export default function DeniedScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const openWhatsApp = () => {
    const msg = CONTACT.whatsappMessageDenied + (user?.email || '');
    Linking.openURL(`https://wa.me/${DEFAULT_PHONE}?text=${encodeURIComponent(msg)}`).catch((e) =>
      console.warn('[denied] wa falló:', e)
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom"]} containerClassName="bg-background"><View style={[styles.container, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, width: "100%", alignSelf: "center" }]}>
      <Text style={styles.icon}>🚫</Text>
      <Text style={styles.title}>{t("accountDenied")}</Text>
      <Text style={styles.body}>
        {t("accountDeniedDescription")}
      </Text>
      <Pressable onPress={openWhatsApp} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.btnText}>{t("appealWhatsapp")}</Text>
      </Pressable>
      <Text style={styles.help}>{CONTACT.whatsappNumberDisplay}</Text>
    </View></ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  body: { color: '#9A9A9A', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btn: { backgroundColor: '#EF4444', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 1 },
  help: { color: '#C9A84C', fontSize: 12, marginTop: 16, fontWeight: '600' },
});