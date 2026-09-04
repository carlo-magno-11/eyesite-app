import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, Platform, ActivityIndicator, Image, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSubmitProperty } from '@/hooks/use-submit-property';
import * as ImagePicker from 'expo-image-picker';

const PROPERTY_TYPES_OPTIONS = [
  { key: 'terreno', label: 'Terreno' },
  { key: 'casa', label: 'Casa' },
  { key: 'hacienda', label: 'Hacienda' },
  { key: 'rancho', label: 'Rancho' },
  { key: 'industrial', label: 'Industrial' },
];

interface FormData {
  title: string;
  type: string;
  municipality: string;
  state: string;
  surfaceM2: string;
  currentPrice: string;
  marketPrice: string;
  priceUnit: string;
  description: string;
}

interface SelectedImage {
  uri: string;
  name: string;
  type: string;
}

const INITIAL_FORM: FormData = {
  title: '',
  type: '',
  municipality: '',
  state: 'Yucatán',
  surfaceM2: '',
  currentPrice: '',
  marketPrice: '',
  priceUnit: 'm²',
  description: '',
};

export default function PublishScreen() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const updateField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const { submitProperty, loading: submitting } = useSubmitProperty();
  const [isLoading, setIsLoading] = useState(false);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset: any) => ({
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'image.jpg',
          type: 'image/jpeg',
        }));
        setSelectedImages((prev) => [...prev, ...newImages]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.type || !form.municipality || !form.currentPrice) {
      Alert.alert('Campos requeridos', 'Por favor completa los campos obligatorios: título, tipo, municipio y precio.');
      return;
    }

    setIsLoading(true);
    try {
      // Convert selected images to URIs
  const imageUris = selectedImages?.map((img) => img.uri) || [];

  const result = await submitProperty({
    titulo: form.title,
    tipo: form.type,
    municipio: form.municipality,
    precio_actual: parseInt(form.currentPrice),
    precio_mercado: form.marketPrice ? parseInt(form.marketPrice) : null,
    unidad_precio: form.priceUnit,
    superficie: form.surfaceM2 ? parseInt(form.surfaceM2) : null,
    unidad_superficie: form.priceUnit === 'ml' ? 'ml' : 'm2',
    descripcion: form.description,
    contacto_nombre: 'Usuario de la App',
    contacto_telefono: '+52 9813674060',
  }, imageUris);

  if (result) {
    setSubmitted(true);
  } else {
    Alert.alert('Error', 'Error al enviar la propiedad. Intenta de nuevo.');
  }
} catch (error: any) {
  Alert.alert('Error', error?.message || 'Error al enviar la propiedad. Intenta de nuevo.');
} finally {
  setIsLoading(false);
}
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setSubmitted(false);
    setSelectedImages([]);
  };

  if (submitted) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>¡Propiedad Enviada!</Text>
          <Text style={styles.successText}>
            Tu propiedad "{form.title}" ha sido enviada para revisión. Nuestro equipo la publicará en breve.
          </Text>
          <Text style={styles.successTagline}>FIND YOUR LEGACY</Text>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.newBtnText}>PUBLICAR OTRA PROPIEDAD</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PUBLICAR PROPIEDAD</Text>
          <Text style={styles.headerSubtitle}>Comparte tu oportunidad inmobiliaria</Text>
        </View>

        <View style={styles.form}>
          {/* Título */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Título de la propiedad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Terreno 5 ha - Mérida, Yucatán"
              placeholderTextColor="#9A9A9A"
              value={form.title}
              onChangeText={(v) => updateField('title', v)}
              returnKeyType="next"
            />
          </View>

          {/* Tipo de propiedad */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Tipo de propiedad *</Text>
            <View style={styles.typeRow}>
              {PROPERTY_TYPES_OPTIONS.map((type) => (
                <Pressable
                  key={type.key}
                  onPress={() => updateField('type', type.key)}
                  style={({ pressed }) => [
                    styles.typeChip,
                    form.type === type.key && styles.typeChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.typeChipText, form.type === type.key && styles.typeChipTextActive]}>
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Ubicación */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Municipio *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Mérida, Progreso, Uxmal"
              placeholderTextColor="#9A9A9A"
              value={form.municipality}
              onChangeText={(v) => updateField('municipality', v)}
              returnKeyType="next"
            />
          </View>

          {/* Superficie */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Superficie (m²)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 5000"
              placeholderTextColor="#9A9A9A"
              value={form.surfaceM2}
              onChangeText={(v) => updateField('surfaceM2', v)}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          {/* Precios */}
          <View style={styles.priceRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Precio actual *</Text>
              <TextInput
                style={styles.input}
                placeholder="$/m²"
                placeholderTextColor="#9A9A9A"
                value={form.currentPrice}
                onChangeText={(v) => updateField('currentPrice', v)}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Precio mercado</Text>
              <TextInput
                style={styles.input}
                placeholder="$/m²"
                placeholderTextColor="#9A9A9A"
                value={form.marketPrice}
                onChangeText={(v) => updateField('marketPrice', v)}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Unidad de precio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Unidad de precio</Text>
            <View style={styles.unitRow}>
              {['m²', 'ml', 'ha'].map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => updateField('priceUnit', unit)}
                  style={({ pressed }) => [
                    styles.unitChip,
                    form.priceUnit === unit && styles.unitChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.unitChipText, form.priceUnit === unit && styles.unitChipTextActive]}>
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Descripción */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe las características, ubicación, accesos y potencial de la propiedad..."
              placeholderTextColor="#9A9A9A"
              value={form.description}
              onChangeText={(v) => updateField('description', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="default"
            />
          </View>

          {/* Fotos */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Fotos de la propiedad</Text>
            <Pressable
              onPress={pickImages}
              disabled={uploadingImages}
              style={({ pressed }) => [styles.photoButton, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="photo.badge.plus" size={20} color="#C9A84C" />
              <Text style={styles.photoButtonText}>AGREGAR FOTOS</Text>
            </Pressable>

            {selectedImages.length > 0 && (
              <View style={styles.photoGallery}>
                <FlatList
                  data={selectedImages}
                  horizontal
                  scrollEnabled={false}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item, index }) => (
                    <View style={styles.photoItem}>
                      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
                      <Pressable
                        onPress={() => removeImage(index)}
                        style={styles.photoRemove}
                      >
                        <Text style={styles.photoRemoveText}>✕</Text>
                      </Pressable>
                    </View>
                  )}
                />
                <Text style={styles.photoCount}>{selectedImages.length} foto(s) seleccionada(s)</Text>
              </View>
            )}
          </View>

          {/* Botón de envío */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }, isLoading && { opacity: 0.6 }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.submitBtnText}>PUBLICAR PROPIEDAD</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            * Al publicar, nuestro equipo revisará la información antes de hacerla visible en la plataforma.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9A9A9A',
  },
  form: {
    padding: 16,
    gap: 20,
  },
  fieldGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C9A84C',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 10,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C9A84C',
    backgroundColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: '#C9A84C',
  },
  typeChipText: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#0D0D0D',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitChip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
  },
  unitChipActive: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  unitChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  unitChipTextActive: {
    color: '#0D0D0D',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#C9A84C',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
  },
  photoButtonText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '600',
  },
  photoGallery: {
    marginTop: 12,
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  photoCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#9A9A9A',
  },
  submitBtn: {
    backgroundColor: '#C9A84C',
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#0D0D0D',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  disclaimer: {
    fontSize: 12,
    color: '#9A9A9A',
    marginTop: 12,
    lineHeight: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#9A9A9A',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successTagline: {
    fontSize: 12,
    color: '#C9A84C',
    letterSpacing: 1.5,
    marginBottom: 24,
    fontWeight: '600',
  },
  newBtn: {
    backgroundColor: '#C9A84C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  newBtnText: {
    color: '#0D0D0D',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
});
