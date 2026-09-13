import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { CONTACT } from '@/constants/contact';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_PHONE = CONTACT.whatsappNumber;

export default function DeniedScreen() {
  const { user } = useAuth();
  const openWhatsApp = () => {
    const msg = CONTACT.whatsappMessageDenied + (user?.email || '');
    Linking.openURL(`https://wa.me/${DEFAULT_PHONE}?text=${encodeURIComponent(msg)}`).catch((e) =>
      console.warn('[denied] wa falló:', e)
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚫</Text>
      <Text style={styles.title}>Cuenta denegada</Text>
      <Text style={styles.body}>
        Lamentablemente tu cuenta no pudo ser aprobada. Si crees que es un error, contáctanos por
        WhatsApp y lo revisamos.
      </Text>
      <Pressable onPress={openWhatsApp} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.btnText}>APELAR POR WHATSAPP</Text>
      </Pressable>
      <Text style={styles.help}>{CONTACT.whatsappNumberDisplay}</Text>
    </View>
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