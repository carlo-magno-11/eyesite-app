import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export function useSubmitProperty() {
  const [loading, setLoading] = useState(false);

  const uploadPhotos = async (uris: string[] | undefined) => {
    if (!uris || uris.length === 0) return [];
    const urls: string[] = [];

    for (let i = 0; i < uris.length; i++) {
      try {
        const uri = uris[i];
        const file = new File(uri);
        const base64 = await file.base64();
        const fileName = `${Date.now()}-${i}.jpg`;

        const { error } = await supabase.storage
         .from('fotos-propiedades')
         .upload(fileName, decode(base64), {
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        const { data } = supabase.storage
         .from('fotos-propiedades')
         .getPublicUrl(fileName);

        urls.push(data.publicUrl);
      } catch (e) {
        console.log('Error subiendo foto', e);
      }
    }
    return urls;
  };

  const submitProperty = async (formData: any, photoUris?: string[]) => {
setLoading(true);
try {
  const { data: { user } } = await supabase.auth.getUser();

  const photoUrls = await uploadPhotos(photoUris);

  const { data, error } = await supabase
  .from('solicitudes_propiedades')
  .insert([{
    user_id: user?.id,
    titulo: formData.titulo || formData.title,
    tipo: formData.tipo || formData.type,
    municipio: formData.municipio || formData.municipality,
    superficie: Number(formData.superficie || formData.surfaceM2 || 0),
    precio_esperado: Number(formData.precio_esperado || formData.currentPrice || 0),
    precio_mercado: Number(formData.precio_mercado || formData.marketPrice || 0),
    descripcion: formData.descripcion || formData.description,
    fotos: photoUrls,
    estado: 'pendiente',
  }]).select();

  if (error) throw error;
  return data;
} catch (error) {
  console.log("ERROR REAL:", error);
  throw error;
} finally {
  setLoading(false);
}
}
return { submitProperty, loading };
}