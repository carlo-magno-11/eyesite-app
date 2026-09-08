import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook reutilizable de Realtime de Supabase (a prueba de errores).
 * Se suscribe a cambios (INSERT/UPDATE/DELETE) de una tabla de schema public
 * y dispara `onChange`. Limpia el canal al desmontar.
 *
 * - Usa el singleton de @/lib/supabase (NO crea otro GoTrueClient).
 * - Se usa una ref para no re-suscribirse cuando cambia la función onChange.
 * - `enabled` permite activar/desactivar la suscripción.
 */
export function useRealtimeTable(table: string, onChange: () => void, enabled = true) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;
    console.log(`[realtime] subscribing to ${table}`);
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        try {
          console.log(`[realtime] ${table} changed -> refetch`);
          onChangeRef.current();
        } catch (e) {
          console.error(`[useRealtimeTable:${table}] onChange falló:`, e);
        }
      })
      .subscribe((status) => {
        console.log(`[realtime:${table}] status`, status);
      });

    return () => {
      console.log(`[realtime] unsub ${table}`);
      supabase.removeChannel(channel);
    };
  }, [table, enabled]);
}