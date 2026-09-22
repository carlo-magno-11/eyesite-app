import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';

export default function PrivacyScreen() {
  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-[#0D0D0D]">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>EYESITE</Text>
        <Text style={styles.title}>AVISO DE PRIVACIDAD</Text>
        <Text style={styles.updated}>Última actualización: septiembre de 2026</Text>

        <Section title="1. Responsable">
          EYESITE es responsable del tratamiento de los datos personales que proporciona el usuario a través de la aplicación y sus servicios inmobiliarios.
        </Section>
        <Section title="2. Datos que podemos tratar">
          Podemos tratar datos necesarios para crear y administrar la cuenta, como nombre, correo electrónico, teléfono, ciudad y preferencias inmobiliarias. Si publicas una propiedad, también podemos tratar la información y archivos que envíes para gestionar, revisar y publicar la solicitud.
        </Section>
        <Section title="3. Ubicación">
          EYESITE puede solicitar ubicación únicamente para funciones relacionadas con el mapa, como mostrar propiedades EYESITE cercanas o permitir que el usuario ubique una propiedad. La ubicación no se almacena simplemente por abrir el mapa. Si no autorizas la ubicación, puedes utilizar el mapa sin ella y proporcionar coordenadas manualmente cuando corresponda.
        </Section>
        <Section title="4. Fotos, videos y archivos">
          El acceso a fotos, videos y archivos se utiliza cuando el usuario decide seleccionar o publicar contenido. Los archivos enviados para revisión pueden almacenarse de forma privada durante el proceso de moderación y los contenidos aprobados pueden hacerse públicos como parte de la ficha inmobiliaria.
        </Section>
        <Section title="5. Finalidades">
          Usamos la información para autenticar cuentas, gestionar favoritos y notificaciones, recibir y moderar solicitudes inmobiliarias, mostrar propiedades publicadas, atender consultas y operar y proteger EYESITE.
        </Section>
        <Section title="6. Terceros y servicios técnicos">
          EYESITE utiliza servicios técnicos necesarios para operar la aplicación, incluyendo Supabase para autenticación, base de datos y almacenamiento, y servicios de mapas cuando el usuario utiliza las funciones cartográficas. No vendemos los datos personales del usuario.
        </Section>
        <Section title="7. Conservación y seguridad">
          Aplicamos controles de acceso, políticas de seguridad y almacenamiento separado para información pública y privada. Conservamos los datos mientras sean necesarios para las finalidades descritas o cuando exista una obligación legal aplicable.
        </Section>
        <Section title="8. Eliminación de la cuenta">
          Puedes iniciar la eliminación de tu cuenta desde la sección “Nosotros” de la aplicación. La eliminación está diseñada para retirar la cuenta y los datos personales asociados que EYESITE controle, incluidos favoritos, notificaciones, solicitudes y el contenido inmobiliario que hayas enviado personalmente. Una propiedad del catálogo creada por EYESITE para una cuenta puede permanecer publicada cuando no constituye contenido personal enviado por esa cuenta; en ese caso se elimina la asociación con el usuario. Se conservan únicamente los datos que deban mantenerse por obligación legal o que formen parte del catálogo de EYESITE y no sean datos personales del usuario.
        </Section>
        <Section title="9. Contacto">
          Para dudas sobre privacidad o tratamiento de datos puedes contactar a EYESITE en informacion@eyesite.com.
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingBottom: 80, backgroundColor: '#0D0D0D' },
  kicker: { color: '#C9A84C', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  title: { color: '#F5F5F5', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  updated: { color: '#777', fontSize: 11, marginTop: 8, marginBottom: 28 },
  section: { marginBottom: 22 },
  sectionTitle: { color: '#C9A84C', fontSize: 14, fontWeight: '900', marginBottom: 8 },
  body: { color: '#C8C8C8', fontSize: 14, lineHeight: 22 },
});
