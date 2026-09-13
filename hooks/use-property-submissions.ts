import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PropertySubmission {
  id: string;
  titulo: string;
  tipo: string;
  municipio: string;
  precio_actual: number;
  precio_mercado?: number;
  unidad_precio: string;
  superficie?: number;
  unidad_superficie?: string;
  descripcion?: string;
  fotos?: string[];
  contacto_nombre: string;
  contacto_telefono?: string;
  contacto_email?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  created_at: string;
  updated_at: string;
}

export function usePropertySubmissions() {
  const [submissions, setSubmissions] = useState<PropertySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('solicitudes_propiedades')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setSubmissions((data || []) as PropertySubmission[]);
      setError(null);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : 'Error loading submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSubmissions();
    }, 0);
    const channel = supabase
      .channel(`solicitudes-changes-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_propiedades' }, () => {
        void loadSubmissions();
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadSubmissions]);

  return { submissions, loading, error, refetch: loadSubmissions };
}
