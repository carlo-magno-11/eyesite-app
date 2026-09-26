import {
  useState,
  useCallback,
  useEffect,
  useRef,
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

const CATALOG_PAGE_SIZE = 24;

export type PropertyCatalogOptions = {
  search?: string;
  municipio?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  minSurface?: number | null;
  maxSurface?: number | null;
  tipo?: string | null;
  pageSize?: number;
};

// El catálogo solo necesita datos de tarjeta/listado.
// Evitamos transferir PDFs, KMZ, JSON, videos y descripciones pesadas.
// El detalle de una propiedad sí puede solicitar el registro completo.
const CATALOG_FIELDS = [
  'id','codigo','titulo','tipo','municipio','ubicacion','direccion',
  'superficie','unidad_superficie','precio_actual','precio_mercado',
  'precio','precio_esperado','unidad_precio','rendimiento','moneda',
  'destacada','fotos','portada_url','portada_tipo','tipo_portada',
  'video_url','activa','estado','orden','created_at','updated_at',
  'latitud','longitud',
].join(',');

function normalizeCatalogNumber(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The PostgREST .or() filter uses raw syntax, so user-entered text must not
 * contain reserved delimiters. Keep search intentionally conservative:
 * letters/numbers/whitespace plus accents and hyphens are enough for EYESITE
 * titles, municipalities and locations.
 */
export function sanitizeCatalogSearchTerm(value?: string | null) {
  return (value ?? '')
    .normalize('NFC')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

export function useProperties(options?: PropertyCatalogOptions) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const requestGeneration = useRef(0);

  const isCatalogMode = Boolean(options);
  const search = sanitizeCatalogSearchTerm(options?.search);
  const municipio = sanitizeCatalogSearchTerm(options?.municipio);
  const minPrice = normalizeCatalogNumber(options?.minPrice);
  const maxPrice = normalizeCatalogNumber(options?.maxPrice);
  const minSurface = normalizeCatalogNumber(options?.minSurface);
  const maxSurface = normalizeCatalogNumber(options?.maxSurface);
  const tipo = options?.tipo?.trim() ?? '';
  const pageSize = Math.max(12, Math.min(options?.pageSize ?? CATALOG_PAGE_SIZE, 48));

  const filterKey = JSON.stringify({
    search: search.toLowerCase(),
    municipio: municipio.toLowerCase(),
    minPrice,
    maxPrice,
    minSurface,
    maxSurface,
    tipo: tipo.toLowerCase(),
    pageSize,
  });

  const fetchPage = useCallback(
    async (from: number, append: boolean) => {
      const requestId = ++requestGeneration.current;
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        let query = supabase
          .from('propiedades_publicas')
          .select(isCatalogMode ? CATALOG_FIELDS : '*')
          .eq('estado', 'activa')
          .order('created_at', { ascending: false });

        if (isCatalogMode && options) {
          if (search) {
            query = query.or(
              `titulo.ilike.%${search}%,tipo.ilike.%${search}%,codigo.ilike.%${search}%,municipio.ilike.%${search}%,ubicacion.ilike.%${search}%,direccion.ilike.%${search}%`,
            );
          }

          if (municipio) query = query.ilike('municipio', `%${municipio}%`);
          if (tipo) query = query.ilike('tipo', tipo);

          if (minPrice !== null) query = query.gte('precio_actual', minPrice);
          if (maxPrice !== null) query = query.lte('precio_actual', maxPrice);
          if (minSurface !== null) query = query.gte('superficie', minSurface);
          if (maxSurface !== null) query = query.lte('superficie', maxSurface);

          query = query.range(from, from + pageSize - 1);
        }

        const { data, error: err } = await query;
        if (err) throw err;

        const rawRows = data ?? [];
        if (requestId !== requestGeneration.current) return;
        const hasNextPage = isCatalogMode && rawRows.length === pageSize;
        const mapped = rawRows.slice(0, pageSize).map(mapProperty);
        setProperties((current) => (append ? [...current, ...mapped] : mapped));
        setHasMore(hasNextPage);
        setError(null);
      } catch (e) {
        if (requestId !== requestGeneration.current) return;
        const message = e instanceof Error ? e.message : 'Error desconocido';
        console.error('❌ EYESITE propiedades:', message);
        setError(message);
        if (!append) setProperties([]);
      } finally {
        if (requestId !== requestGeneration.current) return;
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [filterKey, isCatalogMode, search, municipio, tipo, minPrice, maxPrice, minSurface, maxSurface, pageSize],
  );

  const fetchProperties = useCallback(async () => {
    await fetchPage(0, false);
  }, [fetchPage]);

  // Mantiene estable el canal Realtime aunque cambien filtros/búsqueda.
  // La función actual se actualiza en cada render, pero el listener no se
  // desmonta/recrea innecesariamente al escribir en el catálogo.
  const fetchPropertiesRef = useRef(fetchProperties);
  useEffect(() => {
    fetchPropertiesRef.current = fetchProperties;
  }, [fetchProperties]);

  const loadMore = useCallback(async () => {
    if (!isCatalogMode || loading || loadingMore || !hasMore) return;
    await fetchPage(properties.length, true);
  }, [fetchPage, hasMore, isCatalogMode, loading, loadingMore, properties.length]);

  useFocusEffect(
    useCallback(() => {
      void fetchPropertiesRef.current();

      let refreshTimer: ReturnType<typeof setTimeout> | null = null;

      const channel = supabase
        .channel(`eyesite-live-properties-${++propertyChannelGeneration}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'propiedades_cambios' },
          () => {
            // Agrupa varios cambios consecutivos del panel en una sola lectura.
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
              refreshTimer = null;
              void fetchPropertiesRef.current();
            }, 500);
          },
        )
        .subscribe();

      return () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        void supabase.removeChannel(channel);
      };
    }, [fetchPropertiesRef]),
  );

  return {
    properties,
    loading,
    loadingMore,
    hasMore,
    error,
    refetch: fetchProperties,
    loadMore,
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
          filter: `property_id=eq.${id}`,
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
