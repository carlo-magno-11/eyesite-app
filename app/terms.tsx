import { useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ScreenContainer } from '@/components/screen-container';

const TEXTOS: Record<string, string> = {
  servicio: `TÉRMINOS Y CONDICIONES EYESI+E\n\n1. Plataforma para búsqueda inmobiliaria en Yucatán.\n2. La información de propiedades es referencial, debe verificarse con asesor.\n3. EYESI+E no garantiza disponibilidad inmediata.\n4. El usuario se compromete a datos veraces.\n\nContacto WhatsApp: 999 746 2162`,
  privacidad: `AVISO DE PRIVACIDAD\n\nTus datos (email, nombre, preferencias) se usarán únicamente para contactarte sobre propiedades y listings relevantes, cumpliendo la Ley de Protección de Datos.\nNo vendemos tu info. Baja al WhatsApp 999 746 2162.`,
  datos: `TRATAMIENTO DE DATOS PARA CONTACTO\n\nAutorizas que un asesor de EYESI+E te contacte por WhatsApp, llamada o email para mostrar propiedades y agendar visitas.`
};

const TERMS_ITEMS = [
  { key: 'servicio', label: 'Acepto los Términos y Condiciones de EYESI+E' },
  { key: 'privacidad', label: 'Acepto el Aviso de Privacidad' },
  { key: 'datos', label: 'Autorizo el tratamiento de mis datos personales para contacto' },
];

export default function TermsScreen() {
  const { user } = useAuth();
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
    if (!allAccepted || saving) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        terminos_aceptados: true,
        terminos_fecha: new Date().toISOString(),
      };
      if (user?.id) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (error) {
          console.error('[terms] update falló:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
        }
      }
      await AsyncStorage.setItem('terms_v1', 'true');
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[terms] ERROR REAL:', { code: e?.code, message: e?.message, details: e?.details, hint: e?.hint });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']} containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>TÉRMINOS Y CONDICIONES</Text>
        <Text style={styles.subtitle}>Revisa y acepta para continuar</Text>

        <View style={styles.card}>
          {TERMS_ITEMS.map((item) => (
            <View key={item.key} style={styles.row}>
              <Pressable onPress={() => abrirModal(item.key)} style={{flex:1}}>
                <Text style={styles.label}>
                  {item.label}
                  {!leido[item.key] && <Text style={{color:'#C9A84C'}}> (Ver info)</Text>}
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
          {saving? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.btnText}>ACEPTAR Y CONTINUAR</Text>}
        </Pressable>
        <Text style={styles.hint}>{allAccepted? 'Todo leído y aceptado' : 'Debes leer (Ver info) y aceptar los 3 puntos'}</Text>

        {/* MODAL DE LECTURA */}
        <Modal visible={!!modal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {modal === 'servicio'? 'Términos y Condiciones' : modal === 'privacidad'? 'Aviso de Privacidad' : 'Tratamiento de Datos'}
              </Text>
              <ScrollView style={{maxHeight:380, marginVertical:12}}>
                <Text style={styles.modalText}>{modal? TEXTOS[modal] : ''}</Text>
              </ScrollView>
              <Pressable onPress={confirmarLectura} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>He leído y Confirmo que leí esta información</Text>
              </Pressable>
              <Pressable onPress={()=>setModal(null)} style={{padding:12, alignItems:'center'}}>
                <Text style={{color:'#888'}}>Cerrar sin aceptar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center' },
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