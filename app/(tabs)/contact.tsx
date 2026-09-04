import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';

const CONTACT_INFO = {
  whatsapp: '+52 9813674060',
  phone: '+52 9813674060',
  email: 'informacion@eyesite.com',
  address: 'C. 37 entre 64 y 62 A, Centro de Mérida, Yucatán',
  website: 'https://www.eyesite.mx',
  youtube: 'https://www.youtube.com/@eyesitemx212',
};

const VALUES = [
  {
    title: 'EYESITE',
    text: 'Somos un grupo dedicado a conseguir las mejores oportunidades inmobiliarias, ideal para inversiones o desarrollos que buscan una alta rentabilidad, asegurando que todas las opciones cuenten con total certeza legal.',
  },
  {
    title: 'Valor',
    text: 'Al contratar nuestros servicios lo que obtienes es todo un grupo de profesionales expertos en sus áreas, trabajando en conjunto para obtener las mejores opciones de inversión.',
  },
  {
    title: 'Visión',
    text: 'Ser reconocida como una de las empresas del giro inmobiliario que genera mayor valor, materializando los sueños y las más altas expectativas de sus clientes, inversionistas, socios y amigos.',
  },
  {
    title: 'Misión',
    text: 'Comprometernos a construir relaciones sólidas y duraderas con nuestros clientes, basadas en la transparencia, confianza y en resultados que generen valor, creando impactos positivos en sus vidas.',
  },
];

export default function ContactScreen() {
  const handleWhatsApp = () => {
    const msg = encodeURIComponent('Hola, me interesa conocer más sobre sus propiedades en Eyesite.');
    Linking.openURL(`https://wa.me/${CONTACT_INFO.whatsapp}?text=${msg}`);
  };

  const handlePhone = () => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}`);
  };

  const handleWebsite = () => {
    Linking.openURL(CONTACT_INFO.website);
  };

  const handleYouTube = () => {
    Linking.openURL(CONTACT_INFO.youtube);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header con logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>EYESI<Text style={styles.logoPlus}>+</Text>E</Text>
          <Text style={styles.logoTagline}>FIND YOUR HOME · FIND YOUR LEGACY · FIND YOUR LAND</Text>
          <Text style={styles.experience}>7 años de experiencia en el mercado inmobiliario de Yucatán</Text>
        </View>

        {/* Botones de contacto rápido */}
        <View style={styles.contactButtons}>
          <Pressable
            onPress={handleWhatsApp}
            style={({ pressed }) => [styles.whatsappBtn, pressed && { opacity: 0.85 }]}
          >
            <IconSymbol name="phone" size={20} color="#0D0D0D" />
            <Text style={styles.whatsappBtnText}>CONTACTAR POR WHATSAPP</Text>
          </Pressable>
          <View style={styles.secondaryButtons}>
            <Pressable
              onPress={handlePhone}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="phone.fill" size={18} color="#C9A84C" />
              <Text style={styles.secondaryBtnText}>Llamar</Text>
            </Pressable>
            <Pressable
              onPress={handleEmail}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="envelope.fill" size={18} color="#C9A84C" />
              <Text style={styles.secondaryBtnText}>Email</Text>
            </Pressable>
            <Pressable
              onPress={handleWebsite}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="globe" size={18} color="#C9A84C" />
              <Text style={styles.secondaryBtnText}>Web</Text>
            </Pressable>
            <Pressable
              onPress={handleYouTube}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="play.circle.fill" size={18} color="#C9A84C" />
              <Text style={styles.secondaryBtnText}>YouTube</Text>
            </Pressable>
          </View>
        </View>

        {/* Información de contacto */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>INFORMACIÓN DE CONTACTO</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <IconSymbol name="phone.fill" size={16} color="#C9A84C" />
              <Text style={styles.infoText}>{CONTACT_INFO.phone}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <IconSymbol name="envelope.fill" size={16} color="#C9A84C" />
              <Text style={styles.infoText}>{CONTACT_INFO.email}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <IconSymbol name="location.fill" size={16} color="#C9A84C" />
              <Text style={styles.infoText}>{CONTACT_INFO.address}</Text>
            </View>
          </View>
        </View>

        {/* Acerca de nosotros */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>ACERCA DE NOSOTROS</Text>
          {VALUES.map((item, index) => (
            <View key={index} style={styles.valueCard}>
              <Text style={styles.valueTitle}>{item.title}</Text>
              <Text style={styles.valueText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>EYESI<Text style={styles.logoPlus}>+</Text>E</Text>
          <Text style={styles.footerText}>Mérida, Yucatán, México</Text>
          <Text style={styles.footerCopy}>© 2025 Eyesite. Todos los derechos reservados.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoSection: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  logo: {
    color: '#F5F5F5',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 12,
  },
  logoPlus: {
    color: '#C9A84C',
  },
  logoTagline: {
    color: '#C9A84C',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  experience: {
    color: '#9A9A9A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  contactButtons: {
    padding: 20,
    gap: 12,
  },
  whatsappBtn: {
    backgroundColor: '#C9A84C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 4,
    gap: 10,
  },
  whatsappBtnText: {
    color: '#0D0D0D',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    color: '#F5F5F5',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#F5F5F5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 16,
  },
  infoText: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 14,
    lineHeight: 20,
  },
  aboutSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  valueCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 10,
  },
  valueTitle: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  valueText: {
    color: '#9A9A9A',
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 6,
  },
  footerLogo: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  footerText: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  footerCopy: {
    color: '#9A9A9A',
    fontSize: 11,
  },
});
