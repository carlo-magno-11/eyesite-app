import { View, Text, ScrollView, Pressable, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { ScreenContainer } from '../../../components/screen-container';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
 
export default function SolicitudDetail() {
  const { id } = useLocalSearchParams();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSubmission();
  }, [id]);

  const loadSubmission = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_propiedades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSubmission(data);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar la solicitud');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      // Calculate rendimiento (return rate)
      const rendimiento = submission.precio_mercado
        ? Math.round(((submission.precio_mercado - submission.precio_actual) / submission.precio_actual) * 100)
        : 0;

      // Update submission status
      await supabase
        .from('solicitudes_propiedades')
        .update({ estado: 'aprobada', updated_at: new Date().toISOString() })
        .eq('id', submission.id);

      // Insert into propiedades table
      await supabase.from('propiedades').insert([
        {
          titulo: submission.titulo,
          tipo: submission.tipo,
          municipio: submission.municipio,
          precio_actual: submission.precio_actual,
          precio_mercado: submission.precio_mercado,
          unidad_precio: submission.unidad_precio,
          superficie: submission.superficie,
          unidad_superficie: submission.unidad_superficie,
          rendimiento,
          fotos: submission.fotos || [],
          descripcion: submission.descripcion,
          activa: true,
          destacada: false,
          orden: 0,
        },
      ]);

      Alert.alert('Éxito', 'Solicitud aprobada y publicada');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'No se pudo aprobar la solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    Alert.prompt(
      'Rechazar Solicitud',
      'Escribe el motivo del rechazo (opcional)',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Rechazar',
          onPress: async (reason? : string) => {
            setProcessing(true);
            try {
              await supabase
                .from('solicitudes_propiedades')
                .update({
                  estado: 'rechazada',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', submission.id);

              Alert.alert('Éxito', 'Solicitud rechazada');
              router.back();
            } catch (err) {
              Alert.alert('Error', 'No se pudo rechazar la solicitud');
            } finally {
              setProcessing(false);
            }
          },
          style: 'destructive',
        },
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#C9A84C" />
        </View>
      </ScreenContainer>
    );
  }

  if (!submission) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Solicitud no encontrada</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  submission.estado === 'pendiente'
                    ? '#FFA500'
                    : submission.estado === 'aprobada'
                      ? '#22C55E'
                      : '#EF4444',
              },
            ]}
          >
            <Text style={styles.statusText}>
              {submission.estado === 'pendiente'
                ? '⏳ Pendiente'
                : submission.estado === 'aprobada'
                  ? '✅ Aprobada'
                  : '❌ Rechazada'}
            </Text>
          </View>
        </View>

        {/* Main Info */}
        <View style={styles.section}>
          <Text style={styles.title}>{submission.titulo}</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Tipo</Text>
              <Text style={styles.value}>{submission.tipo}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Municipio</Text>
              <Text style={styles.value}>{submission.municipio}</Text>
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precios</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Precio Actual</Text>
              <Text style={styles.value}>
                ${submission.precio_actual} {submission.unidad_precio}
              </Text>
            </View>
            {submission.precio_mercado && (
              <View style={styles.infoItem}>
                <Text style={styles.label}>Precio Mercado</Text>
                <Text style={styles.value}>
                  ${submission.precio_mercado} {submission.unidad_precio}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Surface */}
        {submission.superficie && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Superficie</Text>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Área</Text>
              <Text style={styles.value}>
                {submission.superficie} {submission.unidad_superficie}
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {submission.descripcion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{submission.descripcion}</Text>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacto</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Text style={styles.label}>Nombre</Text>
              <Text style={styles.value}>{submission.contacto_nombre}</Text>
            </View>
            {submission.contacto_telefono && (
              <View style={styles.contactItem}>
                <Text style={styles.label}>Teléfono</Text>
                <Text style={styles.value}>{submission.contacto_telefono}</Text>
              </View>
            )}
            {submission.contacto_email && (
              <View style={styles.contactItem}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{submission.contacto_email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Photos */}
        {submission.fotos && submission.fotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotos ({submission.fotos.length})</Text>
            <View style={styles.photoGrid}>
              {submission.fotos.map((photo: string, index: number) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        {submission.estado === 'pendiente' && (
          <View style={styles.actionContainer}>
            <Pressable
              onPress={handleApprove}
              disabled={processing}
              style={({ pressed }) => [
                styles.approveBtn,
                pressed && { opacity: 0.8 },
                processing && { opacity: 0.6 },
              ]}
            >
              <Ionicons name={"checkmark.circle" as any } size={20} color="#FFFFFF" />
              <Text style={styles.approveBtnText}>APROBAR Y PUBLICAR</Text>
            </Pressable>

            <Pressable
              onPress={handleReject}
              disabled={processing}
              style={({ pressed }) => [
                styles.rejectBtn,
                pressed && { opacity: 0.8 },
                processing && { opacity: 0.6 },
              ]}
            >
              <Ionicons name={"xmark.circle" as any} size={20} color="#FFFFFF" />
              <Text style={styles.rejectBtnText}>RECHAZAR</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 26,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A84C',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  label: {
    fontSize: 11,
    color: '#9A9A9A',
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  contactCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  contactItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 8,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
