import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadSubmissions();
    setupRealtime();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('solicitudes_propiedades')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setSubmissions(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : 'Error loading submissions');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const subscription = supabase
      .channel('solicitudes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_propiedades',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSubmissions((prev) => [payload.new as PropertySubmission, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as PropertySubmission) : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setSubmissions((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const approveSubmission = async (submissionId: string, propertyData: any) => {
    try {
      // Update submission status
      await supabase
        .from('solicitudes_propiedades')
        .update({ estado: 'aprobada', updated_at: new Date().toISOString() })
        .eq('id', submissionId);

      // Insert into propiedades table
      const { error: insertError } = await supabase.from('propiedades').insert([
        {
          titulo: propertyData.titulo,
          tipo: propertyData.tipo,
          municipio: propertyData.municipio,
          precio_actual: propertyData.precio_actual,
          precio_mercado: propertyData.precio_mercado,
          unidad_precio: propertyData.unidad_precio,
          superficie: propertyData.superficie,
          unidad_superficie: propertyData.unidad_superficie,
          rendimiento: propertyData.rendimiento,
          fotos: propertyData.fotos || [],
          descripcion: propertyData.descripcion,
          activa: true,
          destacada: false,
          orden: 0,
        },
      ]);

      if (insertError) throw insertError;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error approving submission',
      };
    }
  };

  const rejectSubmission = async (submissionId: string, reason?: string) => {
    try {
      await supabase
        .from('solicitudes_propiedades')
        .update({
          estado: 'rechazada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error rejecting submission',
      };
    }
  };

  return {
    submissions,
    loading,
    error,
    approveSubmission,
    rejectSubmission,
    refetch: loadSubmissions,
  };
}
