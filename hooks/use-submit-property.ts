import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { manipulateAsync } from 'expo-image-manipulator';

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

  // TAREA 5: comprime fotos (width 1280, calidad 0.7) antes de subir.
  // Nunca lanza: si falla la compresión usa la original.
  const compressImage = async (uri: string): Promise<string> => {
    try {
      const result = await manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.7 }
      );
      return result.uri;
    } catch (e) {
      console.warn('[compress] no se pudo comprimir, se usa original:', e);
      return uri;
    }
  };

  const uploadFile = async (
    uri: string,
    folder: 'imagenes' | 'videos'
  ): Promise<string> => {
    // EYESITE 4: subida al staging PRIVADO.
    // Path único y aislado: {userId}/{folder}/{timestamp}-{random}.{ext}
    const cleanUri = uri.split('?')[0];
    const extMatch = cleanUri.match(/\.(jpe?g|png|webp|gif|mp4|mov|m4v)$/i);
    const ext = (extMatch?.[1] || (folder === 'videos' ? 'mp4' : 'jpg')).toLowerCase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión para subir archivos.');
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType =
      folder === 'videos'
        ? ext === 'mov'
          ? 'video/quicktime'
          : 'video/mp4'
        : 'image/jpeg';
    const buffer = await readFileArrayBuffer(uri);
    const { error } = await supabase.storage
      .from('eyesite-staging')
      .upload(path, buffer, { contentType, upsert: false });
    if (error) {
      // Log del error REAL de Storage/RLS.
      console.error('[uploadFile] falló:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        path,
        contentType,
      });
      throw error;
    }
    return path;
  };

  const submitProperty = async (
    formData: any,
    photoUris?: string[],
    video?: SubmitVideoPayload
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // ── EYESITE 4: PORTADA + GALERÍA + VIDEO (staging privado) ──
      // photoUris[0] = PORTADA (obligatoria, SIEMPRE se ve en el Home);
      // resto = galería (0-10); el video va SEGUNDO en el detalle.
      const [portadaUri, ...galeriaUris] = photoUris || [];
      let portadaUrl: string | null = null;
      if (portadaUri) {
        try {
          portadaUrl = await uploadFile(await compressImage(portadaUri), 'imagenes');
        } catch (e: any) {
          console.error('[submitProperty] portada falló:', {
            code: e?.code, message: e?.message, details: e?.details, hint: e?.hint,
          });
          throw e;
        }
      }
      // TAREA 5: subida EN PARALELO con Promise.all (tolerante: una foto que falle no pierde el resto)
      const fotosUrls = (
        await Promise.all(
          galeriaUris.slice(0, 10).map(async (uri) => {
            try {
              return await uploadFile(await compressImage(uri), 'imagenes');
            } catch (e: any) {
              console.warn('[submitProperty] foto de galería omitida:', {
                code: e?.code, message: e?.message,
              });
              return null;
            }
          })
        )
      ).filter(Boolean) as string[];
      const fotosArray = [portadaUrl, ...fotosUrls].filter(Boolean) as string[];

      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      if (video?.videoUri) {
        try {
          videoUrl = await uploadFile(video.videoUri, 'videos');
        } catch (e: any) {
          console.warn('[submitProperty] video falló, se continúa sin video:', {
            code: e?.code, message: e?.message,
          });
        }
        if (video.thumbnailUri) {
          try {
            thumbnailUrl = await uploadFile(video.thumbnailUri, 'imagenes');
          } catch {}
        }
      }
      // La portada SIEMPRE es FOTO: la foto del usuario o el thumbnail del video.
      // Los valores son paths privados hasta la aprobación.
      const portadaFinal: string | null = portadaUrl || thumbnailUrl || null;

      // ── V5 ANTI-PGRST204: insert base primero, update extendido después ──
      // basePayload: SOLO columnas verificadas que existen HOY (sondeo anon key):
      // user_id, titulo, tipo, municipio, descripcion, superficie, unidad_superficie,
      // precio_actual, precio_mercado, unidad_precio, contacto_nombre, contacto_telefono,
      // fotos, estado. Nunca puede fallar por 42703/PGRST204.
      const basePayload: Record<string, any> = {
        user_id: user?.id,
        titulo: formData.titulo || formData.title,
        tipo: formData.tipo || formData.type || 'terreno',
        municipio: formData.municipio || formData.municipality,
        descripcion: formData.descripcion,
        superficie: Number(formData.superficie || formData.surfaceM2 || 0),
        unidad_superficie: formData.unidad_superficie,
        precio_actual: Number(formData.precio_actual || formData.currentPrice || 0),
        precio_mercado: formData.precio_mercado ? Number(formData.precio_mercado) : null,
        unidad_precio: formData.unidad_precio,
        contacto_nombre: formData.contacto_nombre,
        contacto_telefono: formData.contacto_telefono,
        fotos: fotosArray,
        estado: 'pendiente',
        latitud: formData.latitud ?? null,
        longitud: formData.longitud ?? null,
      };

      // 1) INSERT base → la propiedad SIEMPRE se crea
      const { data: inserted, error: insertError } = await supabase
        .from('solicitudes_propiedades')
        .insert([basePayload])
        .select()
        .single();

      if (insertError) {
        console.error('[submitProperty] insert base falló:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw insertError;
      }

      // 2) UPDATE extendido: video + portada + precio_esperado (migraciones 20250514/20250515).
      //    Foto y video CONVIVEN: portada_url es FOTO (thumbnail del video o 1a foto);
      //    el video va aparte en video_url/videos. Si el update falla porque la migración
      //    aún no se corrió, la propiedad YA existe y solo se avisa por consola.
      const extendedPayload: Record<string, any> = {
        // portada_url SIEMPRE FOTO (nunca video) → Home sin card negra
        portada_url: portadaFinal,
        fotos: fotosArray,
        precio_esperado: Number(formData.precio_actual || formData.currentPrice || 0),
        tipo_portada: videoUrl ? 'video' : 'foto',
        latitud: formData.latitud ?? null,
        longitud: formData.longitud ?? null,
      };
      if (videoUrl) {
        extendedPayload.video_url = videoUrl;
        extendedPayload.videos = [videoUrl];
      }

      if (Object.keys(extendedPayload).length > 0) {
        const { error: extendedError } = await supabase
          .from('solicitudes_propiedades')
          .update(extendedPayload)
          .eq('id', inserted.id);
        if (extendedError) {
          console.warn('[submitProperty] extended fallo, pero propiedad ya creada:', {
            code: extendedError.code,
            message: extendedError.message,
            details: extendedError.details,
            hint: extendedError.hint,
          });
        }
      }

      return inserted;
    } catch (error) {
      console.error('[submitProperty] ERROR REAL:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };
  return { submitProperty, loading };
}