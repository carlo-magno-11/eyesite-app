import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Property } from '@/lib/properties-data';

const SUPABASE_URL =
  'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';

const PUBLIC_MEDIA_BUCKET = 'eyesite-media';

const PUBLIC_MEDIA_BASE =
  `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}`;

function normalizeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const valueTrimmed = value.trim();

  if (!valueTrimmed) {
    return null;
  }

  // Ya es URL completa.
  if (
    valueTrimmed.startsWith('http://') ||
    valueTrimmed.startsWith('https://')
  ) {
    return valueTrimmed;
  }

  // El Admin puede guardar rutas con /storage/... completas.
  if (valueTrimmed.startsWith('/storage/v1/object/public/')) {
    return `${SUPABASE_URL}${valueTrimmed}`;
  }

  // El Admin puede guardar rutas empezando por el bucket.
  if (valueTrimmed.startsWith(`${PUBLIC_MEDIA_BUCKET}/`)) {
    return `${SUPABASE_URL}/storage/v1/object/public/${valueTrimmed}`;
  }

  // Ruta relativa dentro de eyesite-media.
  return `${PUBLIC_MEDIA_BASE}/${valueTrimmed.replace(/^\/+/, '')}`;
}

function normalizeMediaArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      if (typeof item === 'string') {
        return normalizeMediaUrl(item);
      }

      if (item && typeof item === 'object') {
        return normalizeMediaUrl(
          item.url ??
            item.uri ??
            item.publicUrl ??
            item.public_url ??
            item.path ??
            item.filePath ??
            item.storagePath
        );
      }

      return null;
    })
    .filter((url): url is string => Boolean(url));
}

function normalizeSingleMedia(value: unknown): string | null {
  return normalizeMediaUrl(value);
}

function mapProperty(raw: any): Property {
  const fotos = normalizeMediaArray(
    raw.fotos ?? raw.imagenes ?? raw.images
  );

  const videos = normalizeMediaArray(
    raw.videos
  );

  const portada = normalizeSingleMedia(
    raw.portada_url
  );

  const videoUrl = normalizeSingleMedia(
    raw.video_url
  );

  const normalizedPortada =
    portada ||
    fotos[0] ||
    null;

  const normalizedVideos =
    videoUrl && !videos.includes(videoUrl)
      ? [videoUrl, ...videos]
      : videos;

  return {
    ...raw,

    id: raw.id,

    title:
      raw.titulo ||
      raw.title ||
      '',

    titulo:
      raw.titulo ||
      raw.title ||
      '',

    type:
      raw.tipo ||
      raw.type ||
      '',

    tipo:
      raw.tipo ||
      raw.type ||
      '',

    location:
      raw.municipio ||
      raw.ubicacion ||
      raw.location ||
      '',

    municipality:
      raw.municipio ||
      raw.municipality ||
      '',

    municipio:
      raw.municipio ||
      raw.municipality ||
      '',

    currentPrice:
      Number(raw.precio_actual ?? raw.precio) || 0,

    precio_actual:
      Number(raw.precio_actual ?? raw.precio) || 0,

    marketPrice:
      Number(raw.precio_mercado) || 0,

    precio_mercado:
      Number(raw.precio_mercado) || 0,

    price:
      Number(raw.precio) || 0,

    precio:
      Number(raw.precio) || 0,

    priceUnit:
      raw.unidad_precio || 'm²',

    unidad_precio:
      raw.unidad_precio || 'm²',

    surfaceM2:
      Number(raw.superficie) || 0,

    superficie:
      Number(raw.superficie) || 0,

    surfaceUnit:
      raw.unidad_superficie || 'm²',

    unidad_superficie:
      raw.unidad_superficie || 'm²',

    returnRate:
      Number(raw.rendimiento) || 0,

    rendimiento:
      Number(raw.rendimiento) || 0,

    images: fotos,

    fotos,

    imagenes: fotos,

    videos: normalizedVideos,

    video_url:
      videoUrl ||
      normalizedVideos[0] ||
      null,

    portada_url:
      normalizedPortada,

    tipo_portada:
      raw.tipo_portada ||
      'foto',

    portada_tipo:
      raw.portada_tipo ||
      raw.tipo_portada ||
      'foto',

    description:
      raw.descripcion ||
      raw.description ||
      '',

    descripcion:
      raw.descripcion ||
      raw.description ||
      '',

    featured:
      Boolean(
        raw.destacada ??
        raw.featured ??
        raw.is_featured
      ),

    destacada:
      Boolean(
        raw.destacada ??
        raw.featured ??
        raw.is_featured
      ),

    is_featured:
      Boolean(
        raw.destacada ??
        raw.featured ??
        raw.is_featured
      ),

    estado:
      raw.estado ||
      'activa',

    activa:
      raw.activa !== false,

    code:
      raw.codigo ||
      raw.code ||
      raw.id?.slice(0, 6) ||
      '',

    codigo:
      raw.codigo ||
      raw.code ||
      raw.id?.slice(0, 6) ||
      '',

    constructionM2:
      Number(raw.construccion_m2) || 0,

    construccion_m2:
      Number(raw.construccion_m2) || 0,

    pdfs:
      normalizeMediaArray(raw.pdfs),

    kmz_kml:
      normalizeMediaArray(raw.kmz_kml),

    ubicaciones:
      normalizeMediaArray(raw.ubicaciones),

    tour_360:
      normalizeSingleMedia(raw.tour_360),

    archivos:
      raw.archivos ?? [],

    enlaces:
      raw.enlaces ?? [],

    detalles:
      raw.detalles ?? {},

    caracteristicas:
      raw.caracteristicas ?? {},

    servicios_cercanos:
      raw.servicios_cercanos ?? {},

    latitud:
      raw.latitud ?? null,

    longitud:
      raw.longitud ?? null,
  };
}

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);

      console.log(
        '🔍 EYESITE: cargando propiedades públicas desde Supabase...'
      );

      const { data, error: err } = await supabase
        .from('propiedades_publicas')
        .select('*')
        .eq('estado', 'activa')
        .order('created_at', {
          ascending: false,
        });

      if (err) {
        console.error(
          '❌ EYESITE Supabase:',
          err.message
        );

        setError(err.message);
        setProperties([]);

        return;
      }

      const mapped = (data || []).map(mapProperty);

      console.log(
        `✅ EYESITE: ${mapped.length} propiedades activas`
      );

      setProperties(mapped);
      setError(null);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Error desconocido';

      console.error(
        '❌ EYESITE propiedades:',
        msg
      );

      setError(msg);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();

      const channel = supabase
        .channel('eyesite-live-properties')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'propiedades',
          },
          () => {
            fetchProperties();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [fetchProperties])
  );

  return {
    properties,
    loading,
    error,
    refetch: fetchProperties,
  };
}

export function useProperty(id?: string) {
  const {
    properties,
    loading,
    error,
    refetch,
  } = useProperties();

  const property = properties.find(
    (p) => p.id === id
  );

  return {
    property,
    properties,
    loading,
    error,
    refetch,
  };
}