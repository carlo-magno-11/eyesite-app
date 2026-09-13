import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { CONTACT } from '@/constants/contact';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_PHONE = CONTACT.whatsappNumber;

export default function PendingScreen() {
  const { user } = useAuth();
  const openWhatsApp = () => {
    const msg = CONTACT.whatsappMessagePending + (user?.email || '');
    Linking.openURL(`https://wa.me/${DEFAULT_PHONE}?text=${encodeURIComponent(msg)}`).catch((e) =>
      console.warn('[pending] wa falló:', e)
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⏳</Text>
      <Text style={styles.title}>Tu cuenta está en revisión</Text>
      <Text style={styles.body}>
        Recibimos tu registro. Nuestro equipo está validando tu cuenta. Te notificaremos en
        cuanto sea aprobada.
      </Text>
      <Pressable onPress={openWhatsApp} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.btnText}>CONTACTAR POR WHATSAPP</Text>
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
  btn: { backgroundColor: '#C9A84C', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8 },
  btnText: { color: '#0D0D0D', fontWeight: '700', letterSpacing: 1 },
  help: { color: '#C9A84C', fontSize: 12, marginTop: 16, fontWeight: '600' },
});