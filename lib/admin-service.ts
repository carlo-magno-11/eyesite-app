import { supabase } from '@/lib/supabase';

export async function approvePropertyRequest(requestId: string, overrides?: {
  videoUrl?: string | null;
  portadaUrl?: string | null;
  tipoPortada?: string | null;
  fotos?: string[] | null;
  fotosPro?: string[] | null;
}) {
  const { data, error } = await supabase.rpc('admin_approve_property_request', {
    p_request_id: requestId,
    p_video_url: overrides?.videoUrl ?? null,
    p_portada_url: overrides?.portadaUrl ?? null,
    p_tipo_portada: overrides?.tipoPortada ?? null,
    p_fotos: overrides?.fotos ?? null,
    p_fotos_pro: overrides?.fotosPro ?? null,
  });
  if (error) return { ok: false as const, message: error.message, data: null };
  return { ok: true as const, message: null, data };
}

export async function rejectPropertyRequest(requestId: string, reason: string) {
  const { data, error } = await supabase.rpc('admin_reject_property_request', {
    p_request_id: requestId,
    p_reason: reason.trim(),
  });
  if (error) return { ok: false as const, message: error.message, data: null };
  return { ok: true as const, message: null, data };
}
