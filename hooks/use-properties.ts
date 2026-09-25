import {
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useFocusEffect } from 'expo-router';

import { supabase } from '@/lib/supabase';

import {
  Property,
} from '@/lib/properties-data';

import {
  normalizeMediaUrl,
  normalizeMediaArray,
} from '@/lib/property-media';

export function mapProperty(raw: any): Property {
  const fotos =
    normalizeMediaArray(
      raw.fotos ??
        raw.imagenes ??
        raw.images
    );

  const videos =
    normalizeMediaArray(
      raw.videos
    );

  const portada =
    normalizeMediaUrl(
      raw.portada_url
    );

  const videoUrl =
    normalizeMediaUrl(
      raw.video_url
    );

  /*
   * Una portada que realmente sea un video
   * no puede utilizarse como imagen de tarjeta.
   */
  const normalizedPortada =
    portada &&
    !(
      portada
        .toLowerCase()
        .includes('/videos/') ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(
        portada
      )
    )
      ? portada
      : fotos[0] ?? null;

  const normalizedVideos =
    videoUrl &&
    !videos.includes(videoUrl)
      ? [
          videoUrl,
          ...videos,
        ]
      : videos;

  return {
    ...raw,

    id: raw.id,

    title:
      raw.titulo ??
      raw.title ??
      '',

    titulo:
      raw.titulo ??
      raw.title ??
      '',

    type:
      raw.tipo ??
      raw.type ??
      '',

    tipo:
      raw.tipo ??
      raw.type ??
      '',

    location:
      raw.municipio ??
      raw.ubicacion ??
      raw.location ??
      '',

    ubicacion:
      raw.ubicacion ??
      '',

    municipality:
      raw.municipio ??
      raw.municipality ??
      '',

    municipio:
      raw.municipio ??
      raw.municipality ??
      '',

    direccion:
      raw.direccion ??
      '',

    currentPrice:
      Number(
        raw.precio_actual ??
          raw.precio
      ) || 0,

    precio_actual:
      Number(
        raw.precio_actual ??
          raw.precio
      ) || 0,

    marketPrice:
      Number(
        raw.precio_mercado
      ) || 0,

    precio_mercado:
      Number(
        raw.precio_mercado
      ) || 0,

    expectedPrice:
      Number(
        raw.precio_esperado
      ) || 0,

    precio_esperado:
      Number(
        raw.precio_esperado
      ) || 0,

    price:
      Number(
        raw.precio
      ) || 0,

    precio:
      Number(
        raw.precio
      ) || 0,

    priceUnit:
      raw.unidad_precio ??
      'm²',

    unidad_precio:
      raw.unidad_precio ??
      'm²',

    moneda:
      raw.moneda ??
      'MXN',

    surfaceM2:
      Number(
        raw.superficie
      ) || 0,

    superficie:
      Number(
        raw.superficie
      ) || 0,

    surfaceUnit:
      raw.unidad_superficie ??
      'm²',

    unidad_superficie:
      raw.unidad_superficie ??
      'm²',

    frente:
      Number(raw.frente) || 0,

    fondo:
      Number(raw.fondo) || 0,

    returnRate:
      Number(
        raw.rendimiento
      ) || 0,

    rendimiento:
      Number(
        raw.rendimiento
      ) || 0,

    constructionM2:
      Number(
        raw.construccion_m2
      ) || 0,

    construccion_m2:
      Number(
        raw.construccion_m2
      ) || 0,

    image:
      normalizedPortada ??
      fotos[0] ??
      undefined,

    images:
      fotos,

    imagenes:
      fotos,

    fotos:
      fotos,

    fotos_pro:
      normalizeMediaArray(
        raw.fotos_pro
      ),

    videos:
      normalizedVideos,

    video_url:
      videoUrl ??
      normalizedVideos[0] ??
      null,

    portada_url:
      normalizedPortada,

    tipo_portada:
      raw.tipo_portada ??
      'foto',

    portada_tipo:
      raw.portada_tipo ??
      raw.tipo_portada ??
      'foto',

    description:
      raw.descripcion ??
      raw.description ??
      '',

    descripcion:
      raw.descripcion ??
      raw.description ??
      '',

    descripcion_pro:
      raw.descripcion_pro ??
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
      raw.estado ??
      'activa',

    activa:
      raw.activa !== false,

    code:
      raw.codigo ??
      raw.code ??
      raw.id?.slice(0, 6) ??
      '',

    codigo:
      raw.codigo ??
      raw.code ??
      raw.id?.slice(0, 6) ??
      '',

    estatus_legal:
      raw.estatus_legal ??
      '',

    certeza_legal:
      raw.certeza_legal ??
      '',

    pdfs:
      normalizeMediaArray(
        raw.pdfs
      ),

    kmz_kml:
      normalizeMediaArray(
        raw.kmz_kml
      ),

    ubicaciones:
      normalizeMediaArray(
        raw.ubicaciones
      ),

    tour_360:
      normalizeMediaUrl(
        raw.tour_360
      ),

    archivos:
      raw.archivos ??
      [],

    enlaces:
      raw.enlaces ??
      [],

    detalles:
      raw.detalles ??
      {},

    caracteristicas:
      raw.caracteristicas ??
      {},

    servicios_cercanos:
      raw.servicios_cercanos ??
      {},

    latitud:
      raw.latitud ??
      null,

    longitud:
      raw.longitud ??
      null,

    orden:
      raw.orden,

    created_at:
      raw.created_at,

    updated_at:
      raw.updated_at,
  };
}

let propertyChannelGeneration = 0;

export function useProperties() {
  const [
    properties,
    setProperties,
  ] = useState<Property[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const fetchProperties =
    useCallback(
      async () => {
        try {
          setLoading(true);

          console.log(
            '🔍 EYESITE: cargando propiedades públicas desde Supabase...'
          );

          /*
           * IMPORTANTE:
           * La app solamente consulta
           * propiedades_publicas.
           *
           * Nunca propiedades directamente.
           */
          const {
            data,
            error: err,
          } = await supabase
            .from(
              'propiedades_publicas'
            )
            .select('*')
            .eq(
              'estado',
              'activa'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            );

          if (err) {
            console.error(
              '❌ EYESITE Supabase:',
              err.message
            );

            setError(
              err.message
            );

            setProperties([]);

            return;
          }

          const mapped =
            (data ?? []).map(
              mapProperty
            );

          console.log(
            `✅ EYESITE: ${mapped.length} propiedades activas`
          );

          setProperties(
            mapped
          );

          setError(null);
        } catch (e) {
          const message =
            e instanceof Error
              ? e.message
              : 'Error desconocido';

          console.error(
            '❌ EYESITE propiedades:',
            message
          );

          setError(
            message
          );

          setProperties([]);
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      fetchProperties();

      /*
       * Escuchamos cambios de propiedades.
       * La lectura posterior sigue siendo mediante
       * propiedades_publicas.
       */
      const channel =
        supabase
          .channel(
            `eyesite-live-properties-${++propertyChannelGeneration}`
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'propiedades_cambios',
            },
            () => {
              fetchProperties();
            }
          )
          .subscribe();

      return () => {
        supabase.removeChannel(
          channel
        );
      };
    }, [
      fetchProperties,
    ])
  );

  return {
    properties,
    loading,
    error,
    refetch:
      fetchProperties,
  };
}

export function useProperty(id?: string) {
  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetchProperty = useCallback(async () => {
    if (!id) {
      setProperty(undefined);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('propiedades_publicas')
        .select('*')
        .eq('id', id)
        .eq('estado', 'activa')
        .maybeSingle();

      if (err) throw err;

      setProperty(data ? mapProperty(data) : undefined);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      console.error('❌ EYESITE propiedad:', message);
      setProperty(undefined);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProperty();

    if (!id) {
      return;
    }

    /*
     * El feed de cambios es público de solo lectura.
     * Filtramos por propiedad para que editar otra propiedad
     * no fuerce una recarga innecesaria del detalle actual.
     */
    const channel = supabase
      .channel(`eyesite-live-property-${id}-${++propertyChannelGeneration}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'propiedades_cambios',
          filter: `propiedad_id=eq.${id}`,
        },
        () => {
          void fetchProperty();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchProperty, id]);

  return {
    property,
    properties: property ? [property] : [],
    loading,
    error,
    refetch: fetchProperty,
  };
}
