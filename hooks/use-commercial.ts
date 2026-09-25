import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SavedSearch = {
  id: string;
  user_id: string;
  nombre: string;
  min_price?: number | null;
  max_price?: number | null;
  min_surface?: number | null;
  max_surface?: number | null;
  municipio?: string | null;
  tipo?: string | null;
  objetivo?: string | null;
  plazo_compra?: string | null;
  financiamiento?: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
};

export function useCommercial() {
  const trackPropertyEvent = useCallback(async (
    propertyId: string,
    eventType: 'view' | 'favorite' | 'contact' | 'whatsapp_click' | 'share' | 'map_open' | 'search_match',
    metadata: Record<string, unknown> = {},
    source = 'app',
  ) => {
    if (!propertyId) return { data: null, error: null };

    const { data, error } = await supabase.rpc('track_property_event', {
      p_property_id: propertyId,
      p_event_type: eventType,
      p_source: source,
      p_metadata: metadata,
    });

    if (error) {
      console.warn('[EYESITE commercial] event tracking:', error.message);
    }

    return { data, error };
  }, []);

  const registerProspectInterest = useCallback(async (
    propertyId: string,
    source = 'app',
    metadata: Record<string, unknown> = {},
  ) => {
    const { data, error } = await supabase.rpc('registrar_prospecto_desde_interes', {
      p_property_id: propertyId,
      p_source: source,
      p_metadata: metadata,
    });

    if (error) {
      console.warn('[EYESITE commercial] prospect:', error.message);
    }

    return { data, error };
  }, []);

  return {
    trackPropertyEvent,
    registerProspectInterest,
  };
}

export function useSavedSearches(userId?: string) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setSearches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setSearches([]);
    } else {
      setError(null);
      setSearches((data ?? []) as SavedSearch[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (payload: Omit<SavedSearch, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) throw new Error('Sesión requerida');

    const { data, error: insertError } = await supabase
      .from('saved_searches')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single();

    if (insertError) throw insertError;

    setSearches((current) => [data as SavedSearch, ...current]);
    return data as SavedSearch;
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setSearches((current) => current.filter((item) => item.id !== id));
  }, []);

  return { searches, loading, error, save, remove, refetch: load };
}
