import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export interface AdminSolicitud {
  id: string;
  titulo?: string | null;
  precio?: number | string | null;
  precio_actual?: number | string | null;
  descripcion?: string | null;
  ubicacion?: string | null;
  municipio?: string | null;
  imagenes?: unknown;
  fotos?: unknown;
  tipo?: string | null;
  estado?: string | null;
  created_at?: string | null;
}

export interface AdminActionResult {
  ok: boolean;
  message: string | null;
}

/**
 * Hook de datos para el Panel Admin (adaptado al código REAL del repo):
 *
 * - useAuth (@/hooks/useAuth, Supabase onAuthStateChange) => profile.role
 * - supabase singleton de @/lib/supabase
 * - useRealtimeTable (@/hooks/useRealtimeTable) para que solicitudes nuevas
 *   aparezcan sin recargar (solo si eres admin).
 *
 * Centraliza: gate de admin + listado de solicitudes pendientes +
 * aprobar/rechazar. Las pantallas dejan de hablar directo con la BD.
 */
export function useAdminData() {
  const { profile, loading: authLoading } = useAuth();
  const [solicitudes, setSolicitudes] = useState<AdminSolicitud[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const cargarPendientes = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('solicitudes_propiedades')
        .select('*')
        .ilike('estado', 'Pendiente')
        .order('created_at', { ascending: false });
      if (err) {
        setError(err.message);
        console.error('[useAdminData] cargarPendientes error:', {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint,
        });
        return;
      }
      setSolicitudes((data as AdminSolicitud[]) ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoadingPendientes(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) cargarPendientes();
  }, [isAdmin, cargarPendientes]);

  // Realtime: solicitudes nuevas/actualizadas sin F5 (solo tras ser admin).
  useRealtimeTable(
    'solicitudes_propiedades',
    () => {
      if (isAdmin) cargarPendientes();
    },
    isAdmin
  );

  const aprobar = useCallback(
    async (id: string): Promise<AdminActionResult> => {
      try {
        // 1. Busca la solicitud
        const { data: sol } = await supabase
          .from('solicitudes_propiedades')
          .select('*')
          .eq('id', id)
          .single();
        if (!sol) return { ok: false, message: 'No se encontró la solicitud.' };

        // 2. La crea en la tabla real que ve la app
        const { error } = await supabase.from('propiedades').insert({
          titulo: sol.titulo,
          precio: sol.precio ?? sol.precio_actual,
          descripcion: sol.descripcion,
          ubicacion: sol.ubicacion ?? sol.municipio,
          imagenes: sol.imagenes ?? sol.fotos,
          estado: 'Activa - Visible en app',
          tipo: sol.tipo || 'venta',
        });
        if (error) {
          return {
            ok: false,
            message: `${error.message}${error.details ? ' — ' + error.details : ''}`,
          };
        }

        // 3. Marca la solicitud como aprobada
        const { error: updError } = await supabase
          .from('solicitudes_propiedades')
          .update({ estado: 'aprobada' })
          .eq('id', id);
        if (updError) {
          console.error('[useAdminData] update estado "aprobada" falló:', {
            code: updError.code,
            message: updError.message,
            details: updError.details,
            hint: updError.hint,
          });
        }

        cargarPendientes();
        return { ok: true, message: null };
      } catch (e: any) {
        console.error('[useAdminData] aprobar excepción:', e);
        return { ok: false, message: e?.message ?? 'No se pudo aprobar.' };
      }
    },
    [cargarPendientes]
  );

  const rechazar = useCallback(
    async (id: string, motivo: string): Promise<AdminActionResult> => {
      try {
        const { error } = await supabase
          .from('solicitudes_propiedades')
          .update({ estado: 'rechazada', motivo_rechazo: motivo })
          .eq('id', id);
        if (error) {
          // 42703/PGRST204 = columna faltante (motivo_rechazo: migración 20250515); 42501 = RLS
          console.error('[useAdminData] rechazar ERROR REAL:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          return {
            ok: false,
            message: `${error.message}${error.details ? ' — ' + error.details : ''}`,
          };
        }
        cargarPendientes();
        return { ok: true, message: null };
      } catch (e: any) {
        return { ok: false, message: e?.message ?? 'No se pudo rechazar.' };
      }
    },
    [cargarPendientes]
  );

  return {
    isAdmin,
    authLoading,
    solicitudes,
    loadingPendientes,
    error,
    refresh: cargarPendientes,
    aprobar,
    rechazar,
  };
}