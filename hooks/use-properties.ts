import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Property, MOCK_PROPERTIES } from '@/lib/properties-data';

function mapProperty(raw: any): Property {
  return {
    id: raw.id,
    title: raw.titulo || raw.title || '',
    titulo: raw.titulo || raw.title || '',
    type: raw.tipo || raw.type || '',
    tipo: raw.tipo || raw.type || '',
    location: raw.municipio || raw.location || '',
    municipality: raw.municipio || raw.municipality || '',
    municipio: raw.municipio || raw.municipality || '',
    currentPrice: Number(raw.precio_actual) || 0,
    precio_actual: Number(raw.precio_actual) || 0,
    marketPrice: Number(raw.precio_mercado) || 0,
    precio_mercado: Number(raw.precio_mercado) || 0,
    priceUnit: raw.unidad_precio || 'm²',
    unidad_precio: raw.unidad_precio || 'm²',
    surfaceM2: Number(raw.superficie) || 0,
    superficie: Number(raw.superficie) || 0,
    surfaceUnit: raw.unidad_superficie || 'm²',
    unidad_superficie: raw.unidad_superficie || 'm²',
    returnRate: Number(raw.rendimiento) || 0,
    rendimiento: Number(raw.rendimiento) || 0,
    images: raw.fotos || raw.images || [],
    fotos: raw.fotos || raw.images || [],
    videos: raw.videos || [],
    description: raw.descripcion || raw.description || '',
    descripcion: raw.descripcion || raw.description || '',
    featured: raw.destacada || raw.featured || false,
    destacada: raw.destacada || raw.featured || false,
    is_featured: raw.destacada || raw.featured || false,
    estado: raw.estado || 'activa',
    code: raw.codigo || raw.code || raw.id?.slice(0, 6) || '',
    tipo_portada: raw.tipo_portada || 'foto',
    portada_url: raw.portada_url || null,
    constructionM2: Number(raw.construccion_m2) || 0,
    ...raw,
  };
}

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching propiedades activas desde Supabase...');
      const { data, error: err } = await supabase
        .from('propiedades')
        .select('*')
        .eq('estado', 'activa')
        .order('created_at', { ascending: false });

      if (err) {
        console.error('❌ Supabase error:', err.message);
        setError(err.message);
        // Fallback a MOCK_DATA para que la app nunca se quede en blanco
        setProperties(MOCK_PROPERTIES as Property[]);
        return;
      }

      console.log(`✅ ${data?.length || 0} propiedades activas encontradas`);
      setProperties((data || []).map(mapProperty));
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      console.error('❌ Error cargando propiedades:', msg);
      setError(msg);
      // Fallback a MOCK_DATA para que la app nunca se quede en blanco
      setProperties(MOCK_PROPERTIES as Property[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
      const channel = supabase
        .channel('live-props')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'propiedades' }, () => fetchProperties())
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [])
  );

  return { properties, loading, error, refetch: fetchProperties };
}

export function useProperty(id?: string) {
  const { properties, loading, error, refetch } = useProperties();
  const property = properties.find((p) => p.id === id);
  return { property, properties, loading, error, refetch };
}