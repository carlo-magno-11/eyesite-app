import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubmitVideoPayload {
  videoUri: string;
  videoName?: string;
  videoType?: string;
  thumbnailUri?: string;
}

export function useSubmitProperty() {
  const [loading, setLoading] = useState(false);

  // Lee el archivo directo a ArrayBuffer: evita el +33% y la copia extra de
  // base64 (crítico con videos de hasta 50MB para no tronar la app).
  const readFileArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
    const res = await fetch(uri);
    return res.arrayBuffer();
  };

  const uploadToBucket = async (
    bucket: string,
    fileName: string,
    fileBody: ArrayBuffer,
    contentType: string
  ): Promise<string | null> => {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBody, { contentType });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data?.publicUrl || null;
  };

  const uploadPhotos = async (uris: string[] | undefined) => {
    if (!uris || uris.length === 0) return [];
    const urls: string[] = [];

    for (let i = 0; i < uris.length; i++) {
      try {
        const uri = uris[i];
        const buffer = await readFileArrayBuffer(uri);
        const fileName = `${Date.now()}-${i}.jpg`;
        const url = await uploadToBucket('fotos-propiedades', fileName, buffer, 'image/jpeg');
        if (url) urls.push(url);
      } catch (e) {
        console.log('Error subiendo foto', e);
      }
    }
    return urls;
  };

  /**
   * Sube el video de portada (+ thumbnail). Intenta el bucket 'videos-propiedades'
   * y hace fallback a 'fotos-propiedades' si no existe. Nunca lanza: si falla
   * devuelve nulls para no bloquear la publicación.
   */
  const uploadVideo = async (
    video: SubmitVideoPayload
  ): Promise<{ videoUrl: string | null; thumbnailUrl: string | null }> => {
    let videoUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    try {
      const ext = video.videoName?.split('.').pop()?.toLowerCase() || 'mp4';
      const videoFileName = `videos/${Date.now()}-portada.${ext}`;
      const contentType = video.videoType || (ext === 'mov' ? 'video/quicktime' : 'video/mp4');
      const videoBuffer = await readFileArrayBuffer(video.videoUri);

      try {
        videoUrl = await uploadToBucket('videos-propiedades', videoFileName, videoBuffer, contentType);
      } catch (primaryError) {
        // Fallback: bucket de fotos (existe seguro)
        console.log('Bucket videos-propiedades falló, fallback a fotos-propiedades:', primaryError);
        videoUrl = await uploadToBucket('fotos-propiedades', videoFileName, videoBuffer, contentType);
      }
    } catch (e) {
      console.log('Error subiendo video de portada', e);
    }

    if (video.thumbnailUri) {
      try {
        const thumbBuffer = await readFileArrayBuffer(video.thumbnailUri);
        const thumbFileName = `thumbs/${Date.now()}-portada.jpg`;
        thumbnailUrl = await uploadToBucket('fotos-propiedades', thumbFileName, thumbBuffer, 'image/jpeg');
      } catch (e) {
        console.log('Error subiendo thumbnail de portada', e);
      }
    }

    return { videoUrl, thumbnailUrl };
  };

  const submitProperty = async (
    formData: any,
    photoUris?: string[],
    video?: SubmitVideoPayload
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const photoUrls = await uploadPhotos(photoUris);

      // Video de portada (opcional, best-effort)
      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      if (video?.videoUri) {
        const uploaded = await uploadVideo(video);
        videoUrl = uploaded.videoUrl;
        thumbnailUrl = uploaded.thumbnailUrl;
      }

      // IMPORTANTE: 'descripcion' NO existe en solicitudes_propiedades.
      // Se separa del formData para no enviarla al insert (evita el error
      // "Could not find the 'descripcion' column of 'solicitudes_propiedades'").
      const { descripcion, ...datosLimpios } = formData;

      // Payload base con columnas que sí existen en la tabla
      const basePayload: Record<string, any> = {
        user_id: user?.id,
        titulo: datosLimpios.titulo || datosLimpios.title,
        tipo: datosLimpios.tipo || datosLimpios.type,
        municipio: datosLimpios.municipio || datosLimpios.municipality,
        superficie: Number(datosLimpios.superficie || datosLimpios.surfaceM2 || 0),
        precio_esperado: Number(datosLimpios.precio_esperado || datosLimpios.currentPrice || 0),
        precio_mercado: Number(datosLimpios.precio_mercado || datosLimpios.marketPrice || 0),
        unidad_precio: datosLimpios.unidad_precio,
        unidad_superficie: datosLimpios.unidad_superficie,
        contacto_nombre: datosLimpios.contacto_nombre,
        contacto_telefono: datosLimpios.contacto_telefono,
        fotos: photoUrls,
        estado: 'pendiente',
      };

      // Payload extendido con portada en video (columnas opcionales)
      const payloadConVideo: Record<string, any> = {
        ...basePayload,
        ...(videoUrl ? { video_url: videoUrl } : {}),
        ...(videoUrl ? { tipo_portada: 'video' } : {}),
        ...(thumbnailUrl ? { portada_url: thumbnailUrl } : {}),
      };

      // Inserción defensiva: si la tabla no tiene las columnas de video,
      // reintenta solo con el payload base conocido.
      let data: any = null;
      let error: any = null;
      ({ data, error } = await supabase
        .from('solicitudes_propiedades')
        .insert([payloadConVideo])
        .select());

      if (error && /column|Could not find/i.test(error.message || '')) {
        console.log('Reintentando insert sin columnas de video:', error.message);
        ({ data, error } = await supabase
          .from('solicitudes_propiedades')
          .insert([basePayload])
          .select());
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.log('ERROR REAL:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  return { submitProperty, loading };
}