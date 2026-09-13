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
  videos?: unknown;
  video_url?: string | null;
  portada_url?: string | null;
  tipo_portada?: string | null;
  precio_mercado?: number | string | null;
  unidad_precio?: string | null;
  superficie?: number | string | null;
  unidad_superficie?: string | null;
  rendimiento?: number | string | null;
  tipo?: string | null;
  estado?: string | null;
  created_at?: string | null;
}

export interface AdminActionResult { ok: boolean; message: string | null; }

export function useAdminData() {
  const { profile, loading: authLoading } = useAuth();
  const [solicitudes, setSolicitudes] = useState<AdminSolicitud[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';

  const cargarPendientes = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingPendientes(true);
    const { data, error: err } = await supabase
      .from('solicitudes_propiedades')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else { setSolicitudes((data as AdminSolicitud[]) ?? []); setError(null); }
    setLoadingPendientes(false);
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void cargarPendientes();
    }, 0);
    return () => clearTimeout(timer);
  }, [cargarPendientes]);
  useRealtimeTable('solicitudes_propiedades', cargarPendientes, isAdmin);


  return { isAdmin, authLoading, solicitudes, loadingPendientes, error, refresh: cargarPendientes };
}
