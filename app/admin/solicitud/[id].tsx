import { View, Text, ScrollView, Pressable, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { ScreenContainer } from '../../../components/screen-container';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';

// Portada en video: máximo 1 minuto y 100MB (misma lógica que publish)
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;
const PORTADA_OPTIONS = [
  { key: 'foto', label: 'Foto' },
  { key: 'video', label: 'Video' },
];
 
export default function SolicitudDetail() {
  const { id } = useLocalSearchParams();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ---- Edición de portada (misma lógica que publish) ----
  const [activeTab, setActiveTab] = useState<'foto' | 'video'>('foto');
  const [nuevoVideoUri, setNuevoVideoUri] = useState<string | null>(null);
  const [nuevaPortadaUrl, setNuevaPortadaUrl] = useState<string | null>(null);
  const [videoEliminado, setVideoEliminado] = useState(false);
  const [processingVideo, setProcessingVideo] = useState(false);

  const loadSubmission = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_propiedades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSubmission(data);
      // Sincroniza el tab con el video existente de la solicitud
      if (data?.video_url && data?.tipo_portada === 'video') {
        setActiveTab('video');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar la solicitud');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSubmission();
    }, [id])
  );
  const pickVideo = async () => {
    try {
      setProcessingVideo(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        videoMaxDuration: 60,
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;

        // Validación: máximo 1 minuto y 100MB
        const duration = typeof asset.duration === 'number' ? asset.duration : 0;
        let fileSize = typeof asset.fileSize === 'number' ? asset.fileSize : 0;
        if (!fileSize) {
          try {
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists && typeof info.size === 'number') fileSize = info.size;
          } catch (sizeError) {
            console.log('No se pudo verificar el tamaño del video:', sizeError);
          }
        }
        if (duration > MAX_VIDEO_SECONDS || fileSize > MAX_VIDEO_BYTES) {
          Alert.alert('Video no válido', 'Máximo 1 minuto y 100MB');
          return;
        }

        // Thumbnail de portada (segundo 1) — mismo enfoque que publish
        let thumbnail: string | null = null;
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          thumbnail = thumbUri;
        } catch (thumbError) {
          console.log('No se pudo generar thumbnail:', thumbError);
        }

        setNuevoVideoUri(uri);
        setNuevaPortadaUrl(thumbnail);
        setVideoEliminado(false);
        setActiveTab('video');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el video');
    } finally {
      setProcessingVideo(false);
    }
  };

  // Eliminar video de portada: sin video, portada en foto
  const removeVideo = () => {
    setNuevoVideoUri(null);
    setNuevaPortadaUrl(null);
    setVideoEliminado(true);
    setActiveTab('foto');
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      // Calculate rendimiento (return rate)
      const rendimiento = submission.precio_mercado
        ? Math.round(((submission.precio_mercado - submission.precio_actual) / submission.precio_actual) * 100)
        : 0;

      // ---- Video de portada (editable por el admin) ----
      let videoUrlFinal: string | null = submission.video_url || null;
      let portadaUrlFinal: string | null = submission.portada_url || null;
      let tipoPortadaFinal: 'foto' | 'video' = videoUrlFinal
        ? (submission.tipo_portada === 'video' ? 'video' : 'foto')
        : 'foto';

      if (videoEliminado) {
        // Eliminar: sin video, portada en foto
        videoUrlFinal = null;
        portadaUrlFinal = null;
        tipoPortadaFinal = 'foto';
      } else if (nuevoVideoUri) {
        try {
          // Video a 'videos-propiedades' como ArrayBuffer (nunca base64)
          const res = await fetch(nuevoVideoUri);
          const arrayBuffer = await res.arrayBuffer();
          const videoPath = `${Date.now()}.mp4`;
          const { error: videoUploadError } = await supabase.storage
            .from('videos-propiedades')
            .upload(videoPath, arrayBuffer, { contentType: 'video/mp4' });
          if (videoUploadError) throw videoUploadError;
          const { data: videoPublic } = supabase.storage
            .from('videos-propiedades')
            .getPublicUrl(videoPath);
          videoUrlFinal = videoPublic?.publicUrl || null;

          // Thumbnail de portada a 'fotos-propiedades'
          if (nuevaPortadaUrl) {
            try {
              const thumbRes = await fetch(nuevaPortadaUrl);
              const thumbBuffer = await thumbRes.arrayBuffer();
              const thumbPath = `thumbs/${Date.now()}-portada.jpg`;
              const { error: thumbUploadError } = await supabase.storage
                .from('fotos-propiedades')
                .upload(thumbPath, thumbBuffer, { contentType: 'image/jpeg' });
              if (!thumbUploadError) {
                const { data: thumbPublic } = supabase.storage
                  .from('fotos-propiedades')
                  .getPublicUrl(thumbPath);
                portadaUrlFinal = thumbPublic?.publicUrl || portadaUrlFinal;
              }
            } catch (thumbErr) {
              console.log('No se pudo subir el thumbnail de portada:', thumbErr);
            }
          }

          tipoPortadaFinal = activeTab === 'video' ? 'video' : 'foto';
        } catch (videoErr) {
          console.log('No se pudo subir el video nuevo:', videoErr);
          Alert.alert('Aviso', 'No se pudo subir el video nuevo; se conserva el video actual.');
        }
      }

      // Update submission status (+ refleja la edición de portada)
      const solicitudUpdate: Record<string, any> = {
        estado: 'aprobada',
        updated_at: new Date().toISOString(),
      };
      if (nuevoVideoUri || videoEliminado) {
        solicitudUpdate.video_url = videoUrlFinal;
        solicitudUpdate.tipo_portada = tipoPortadaFinal;
        solicitudUpdate.portada_url = portadaUrlFinal;
      }
      const { error: updErr } = await supabase
        .from('solicitudes_propiedades')
        .update(solicitudUpdate)
        .eq('id', submission.id);
      if (updErr) {
        console.error('[handleApprove] update solicitud falló:', {
          code: updErr.code, message: updErr.message, details: updErr.details, hint: updErr.hint,
        });
      }

      // Insert into propiedades table (defensivo: reintenta sin columnas de video)
      const propertyPayload: Record<string, any> = {
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
      };

      const { error: insertError } = await supabase.from('propiedades').insert([
        {
          ...propertyPayload,
          video_url: videoUrlFinal,
          tipo_portada: tipoPortadaFinal,
          portada_url: portadaUrlFinal,
        },
      ]);
      if (insertError) {
        console.error('[handleApprove] insert propiedades falló:', {
          code: insertError.code, message: insertError.message,
          details: insertError.details, hint: insertError.hint,
        });
      }
      if (insertError && /column|Could not find/i.test(insertError.message || '')) {
        console.log('Reintentando insert sin columnas de video:', insertError.message);
        const { error: retryError } = await supabase.from('propiedades').insert([propertyPayload]);
        if (retryError) {
          console.error('[handleApprove] reintento falló:', {
            code: retryError.code, message: retryError.message,
            details: retryError.details, hint: retryError.hint,
          });
          throw retryError;
        }
      } else if (insertError) {
        throw insertError;
      }

      Alert.alert('Éxito', 'Solicitud aprobada y publicada');
      router.back();
    } catch (err: any) {
      console.error('[handleApprove] ERROR REAL:', {
        code: err?.code, message: err?.message, details: err?.details, hint: err?.hint,
      });
      Alert.alert('Error', `${err?.message || 'No se pudo aprobar la solicitud'}${err?.details ? ' — ' + err.details : ''}`);
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
              const { error } = await supabase
                .from('solicitudes_propiedades')
                .update({
                  estado: 'rechazada',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', submission.id);
              if (error) {
                console.error('[handleReject] ERROR REAL:', {
                  code: error.code, message: error.message, details: error.details, hint: error.hint,
                });
                Alert.alert('Error', `${error.message}${error.details ? ' — ' + error.details : ''}`);
                return;
              }

              Alert.alert('Éxito', 'Solicitud rechazada');
              router.back();
            } catch (err: any) {
              console.error('[handleReject] ERROR REAL:', {
                code: err?.code, message: err?.message, details: err?.details, hint: err?.hint,
              });
              Alert.alert('Error', err?.message || 'No se pudo rechazar la solicitud');
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
                  <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Portada: Foto / Video (editable, misma lógica que publish) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portada</Text>
          <View style={styles.tabRow}>
            {PORTADA_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setActiveTab(opt.key as 'foto' | 'video')}
                style={({ pressed }) => [
                  styles.tabChip,
                  activeTab === opt.key && styles.tabChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.tabChipText, activeTab === opt.key && styles.tabChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Preview del video existente (remoto) */}
          {!nuevoVideoUri && !videoEliminado && submission.video_url && (
            <View style={styles.videoPreviewWrap}>
              <View style={styles.videoPreview}>
                <Image
                  source={{ uri: submission.portada_url || (submission.fotos || [])[0] || undefined }}
                  style={styles.videoThumb}
                  resizeMode="cover"
                />
                <View style={styles.videoBadge}>
                  <Text style={styles.videoBadgeText}>VIDEO</Text>
                </View>
              </View>
              <View style={styles.videoActionsRow}>
                <Pressable
                  onPress={pickVideo}
                  disabled={processingVideo}
                  style={({ pressed }) => [styles.videoActionBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.videoActionBtnText}>CAMBIAR</Text>
                </Pressable>
                <Pressable
                  onPress={removeVideo}
                  style={({ pressed }) => [styles.videoActionBtnDelete, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.videoActionBtnDeleteText}>ELIMINAR</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Preview del video nuevo (local, antes de aprobar) */}
          {nuevoVideoUri && (
            <View style={styles.videoPreviewWrap}>
              <View style={styles.videoPreview}>
                {nuevaPortadaUrl ? (
                  <Image source={{ uri: nuevaPortadaUrl }} style={styles.videoThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.videoThumb, styles.videoThumbPlaceholder]}>
                    <Text style={styles.videoThumbPlaceholderText}>🎬</Text>
                  </View>
                )}
                <View style={styles.videoBadge}>
                  <Text style={styles.videoBadgeText}>VIDEO</Text>
                </View>
              </View>
              <View style={styles.videoActionsRow}>
                <Pressable
                  onPress={pickVideo}
                  disabled={processingVideo}
                  style={({ pressed }) => [styles.videoActionBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.videoActionBtnText}>
                    {processingVideo ? 'PROCESANDO...' : 'CAMBIAR'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={removeVideo}
                  style={({ pressed }) => [styles.videoActionBtnDelete, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.videoActionBtnDeleteText}>ELIMINAR</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Seleccionar video: tab en video sin ninguno disponible */}
          {activeTab === 'video' && !nuevoVideoUri && !(submission.video_url && !videoEliminado) && (
            <Pressable
              onPress={pickVideo}
              disabled={processingVideo}
              style={({ pressed }) => [styles.photoButton, pressed && { opacity: 0.7 }]}
            >
              {processingVideo ? (
                <ActivityIndicator color="#C9A84C" size="small" />
              ) : (
                <Ionicons name={'videocam-outline' as any} size={20} color="#C9A84C" />
              )}
              <Text style={styles.photoButtonText}>
                {processingVideo ? 'PROCESANDO VIDEO...' : 'SELECCIONAR VIDEO (MÁX 1 MIN Y 100MB)'}
              </Text>
            </Pressable>
          )}
        </View>

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
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C9A84C',
    backgroundColor: '#1A1A1A',
  },
  tabChipActive: {
    backgroundColor: '#C9A84C',
  },
  tabChipText: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#0D0D0D',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#C9A84C',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
  },
  photoButtonText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
  },
  videoPreviewWrap: {
    marginTop: 4,
  },
  videoPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  videoThumb: {
    width: 160,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  videoThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbPlaceholderText: {
    fontSize: 32,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#C9A84C',
  },
  videoBadgeText: {
    color: '#C9A84C',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  videoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  videoActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C9A84C',
    backgroundColor: '#1A1A1A',
  },
  videoActionBtnText: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '700',
  },
  videoActionBtnDelete: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#1A1A1A',
  },
  videoActionBtnDeleteText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
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
