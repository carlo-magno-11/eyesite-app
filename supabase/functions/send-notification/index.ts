import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const H = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: H });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const adminClient = createClient(url, serviceKey);

    const { data: authData } = await userClient.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), { status: 401, headers: H });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role,estado")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" || profile?.estado !== "activa") {
      return new Response(JSON.stringify({ error: "Solo administradores activos" }), { status: 403, headers: H });
    }

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > 64 * 1024) {
      return new Response(JSON.stringify({ error: "Payload demasiado grande" }), { status: 413, headers: H });
    }

    const body = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "El cuerpo debe ser un objeto JSON" }), { status: 400, headers: H });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = (value: unknown): value is string =>
      typeof value === "string" && UUID_RE.test(value.trim());

    const isBoundedString = (value: unknown, max: number) =>
      typeof value === "string" && value.length <= max;

    if (body.user_id !== undefined && !isUuid(body.user_id)) {
      return new Response(JSON.stringify({ error: "user_id inválido" }), { status: 400, headers: H });
    }

    if (body.user_ids !== undefined) {
      if (!Array.isArray(body.user_ids) || body.user_ids.length > 500 || body.user_ids.some((id: unknown) => !isUuid(id))) {
        return new Response(JSON.stringify({ error: "user_ids inválido o excede el máximo de 500 destinatarios" }), { status: 400, headers: H });
      }
    }

    if (body.property_id !== undefined && !isUuid(body.property_id)) {
      return new Response(JSON.stringify({ error: "property_id inválido" }), { status: 400, headers: H });
    }

    if (body.announcement_id !== undefined && !isUuid(body.announcement_id)) {
      return new Response(JSON.stringify({ error: "announcement_id inválido" }), { status: 400, headers: H });
    }

    if (body.titulo !== undefined && !isBoundedString(body.titulo, 120)) {
      return new Response(JSON.stringify({ error: "titulo inválido o demasiado largo" }), { status: 400, headers: H });
    }

    if (body.mensaje !== undefined && !isBoundedString(body.mensaje, 4000)) {
      return new Response(JSON.stringify({ error: "mensaje inválido o demasiado largo" }), { status: 400, headers: H });
    }

    if (body.tipo !== undefined && !isBoundedString(body.tipo, 64)) {
      return new Response(JSON.stringify({ error: "tipo inválido o demasiado largo" }), { status: 400, headers: H });
    }

    if (body.event_key !== undefined && !isBoundedString(body.event_key, 160)) {
      return new Response(JSON.stringify({ error: "event_key inválido o demasiado largo" }), { status: 400, headers: H });
    }

    if (body.in_app !== undefined && typeof body.in_app !== "boolean") {
      return new Response(JSON.stringify({ error: "in_app debe ser booleano" }), { status: 400, headers: H });
    }

    if (body.data !== undefined && (typeof body.data !== "object" || body.data === null || Array.isArray(body.data))) {
      return new Response(JSON.stringify({ error: "data debe ser un objeto JSON" }), { status: 400, headers: H });
    }

    if (body.data !== undefined) {
      let dataSize = 0;
      try {
        dataSize = JSON.stringify(body.data).length;
      } catch {
        return new Response(JSON.stringify({ error: "data no es serializable" }), { status: 400, headers: H });
      }
      if (dataSize > 16 * 1024) {
        return new Response(JSON.stringify({ error: "data demasiado grande" }), { status: 400, headers: H });
      }
    }

    if (body.user_ids && body.user_ids.length + (body.user_id ? 1 : 0) > 500 && !body.property_id) {
      return new Response(JSON.stringify({ error: "La solicitud supera el máximo de 500 destinatarios" }), { status: 400, headers: H });
    }

    const targetUserId = body.user_id ? String(body.user_id) : null;
    const targetUserIds = Array.isArray(body.user_ids)
      ? body.user_ids.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    const propertyId = body.property_id ? String(body.property_id) : null;
    const createInApp = body.in_app === true;
    const navigationData = {
      ...(body.data && typeof body.data === "object" ? body.data : {}),
      ...(body.property_id ? { property_id: String(body.property_id) } : {}),
      ...(body.announcement_id ? { announcement_id: String(body.announcement_id) } : {}),
    };

    let resolvedUserIds = [...targetUserIds];

    if (propertyId) {
      const { data: favoriteRows, error: favoriteError } = await adminClient
        .from("favoritos")
        .select("user_id")
        .eq("property_id", propertyId);
      if (favoriteError) throw favoriteError;
      resolvedUserIds.push(...(favoriteRows || []).map((row: any) => row.user_id).filter(Boolean));
    }

    if (targetUserId) resolvedUserIds.push(targetUserId);

    resolvedUserIds = [...new Set(resolvedUserIds)];

    if (resolvedUserIds.length > 500) {
      return new Response(JSON.stringify({ error: "La solicitud supera el máximo de 500 destinatarios" }), { status: 400, headers: H });
    }

    let query = adminClient
      .from("profiles")
      .select("id,expo_push_token,notificaciones_push,notificaciones_in_app,anuncios_push")
      .eq("estado", "activa");

    if (resolvedUserIds.length) {
      query = query.in("id", resolvedUserIds);
    } else if (!propertyId && !targetUserId) {
      query = query.neq("role", "admin");
    }

    const { data: rows, error: rowsError } = await query;
    if (rowsError) throw rowsError;

    const finalUserIds = resolvedUserIds.length
      ? resolvedUserIds
      : (rows || []).map((row: any) => row.id).filter(Boolean);

    if (createInApp && finalUserIds.length) {
      const { data: inAppProfiles, error: inAppProfilesError } = await adminClient
        .from("profiles")
        .select("id,notificaciones_in_app")
        .in("id", finalUserIds)
        .eq("estado", "activa");
      if (inAppProfilesError) throw inAppProfilesError;

      const inAppUserIds = (inAppProfiles || [])
        .filter((p: any) => p.notificaciones_in_app !== false)
        .map((p: any) => p.id);

      if (!inAppUserIds.length) {
        // El usuario puede haber desactivado las notificaciones in-app.
      }

      const eventBase = String(body.event_key || crypto.randomUUID());
      const { error: notificationError } = await adminClient
        .from("notificaciones")
        .upsert(
          (inAppUserIds).map((id) => ({
            user_id: id,
            titulo: String(body.titulo || "EYESITE"),
            mensaje: String(body.mensaje || ""),
            tipo: String(body.tipo || "informacion"),
            leida: false,
            event_key: `${eventBase}:${id}`,
            programada_para: new Date().toISOString(),
            estado_envio: "sent",
            sent_at: new Date().toISOString(),
            data: navigationData,
          })),
          { onConflict: "event_key", ignoreDuplicates: true },
        );
      if (notificationError) throw notificationError;
    }

    const isAnnouncement = Boolean(body.announcement_id || navigationData.announcement_id || String(body.tipo || "").toLowerCase() === "anuncio");
    const announcementId = body.announcement_id ? String(body.announcement_id) : null;

    if (announcementId) {
      const { data: announcement, error: announcementError } = await adminClient
        .from("anuncios")
        .select("id,activa,estado_publicacion")
        .eq("id", announcementId)
        .maybeSingle();
      if (announcementError) throw announcementError;
      if (!announcement || announcement.estado_publicacion !== "publicado" || announcement.activa !== true) {
        return new Response(JSON.stringify({ error: "El anuncio no está publicado y activo" }), { status: 400, headers: H });
      }

      const deliveryRows = (rows || []).map((row: any) => ({
        anuncio_id: announcementId,
        user_id: row.id,
      }));
      if (deliveryRows.length) {
        const { error: deliveryError } = await adminClient
          .from("anuncio_entregas")
          .upsert(deliveryRows, { onConflict: "anuncio_id,user_id", ignoreDuplicates: true });
        if (deliveryError) throw deliveryError;
      }
    }

    const messages = (rows || [])
      .filter((row: any) => {
        const pushEnabled = isAnnouncement
          ? row.anuncios_push !== false
          : row.notificaciones_push !== false;
        return pushEnabled
          && typeof row.expo_push_token === "string"
          && row.expo_push_token.startsWith("ExponentPushToken[");
      })
      .map((row: any) => ({
        userId: row.id,
        to: row.expo_push_token,
        sound: "default",
        title: String(body.titulo || "EYESITE"),
        body: String(body.mensaje || ""),
        data: {
          tipo: String(body.tipo || "informacion"),
          ...navigationData,
        },
      }));

    if (!messages.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, invalid_tokens: 0 }), { headers: H });
    }

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();
    const tickets = Array.isArray(expoResult?.data) ? expoResult.data : [];

    let sent = 0;
    const invalidTokens: string[] = [];
    const deliveryNow = new Date().toISOString();

    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index];
      const message = messages[index];
      if (ticket?.status === "ok") {
        sent += 1;
        if (announcementId && message?.userId) {
          await adminClient
            .from("anuncio_entregas")
            .update({
              push_status: "sent",
              push_attempts: 1,
              sent_at: deliveryNow,
              push_next_retry_at: null,
              push_error: null,
              updated_at: deliveryNow,
            })
            .eq("anuncio_id", announcementId)
            .eq("user_id", message.userId);
        }
      } else if (ticket?.details?.error === "DeviceNotRegistered") {
        const token = message?.to;
        if (token) invalidTokens.push(token);
        if (announcementId && message?.userId) {
          await adminClient
            .from("anuncio_entregas")
            .update({
              push_status: "not_configured",
              push_attempts: 1,
              push_next_retry_at: null,
              push_error: "DeviceNotRegistered",
              updated_at: deliveryNow,
            })
            .eq("anuncio_id", announcementId)
            .eq("user_id", message.userId);
        }
      } else if (announcementId && message?.userId) {
        await adminClient
          .from("anuncio_entregas")
          .update({
            push_status: "error",
            push_attempts: 1,
            push_next_retry_at: deliveryNow,
            push_error: String(ticket?.details?.error || ticket?.message || "Push rechazado"),
            updated_at: deliveryNow,
          })
          .eq("anuncio_id", announcementId)
          .eq("user_id", message.userId);
      }
    }

    if (invalidTokens.length) {
      await adminClient
        .from("profiles")
        .update({ expo_push_token: null })
        .in("expo_push_token", invalidTokens);
    }

    return new Response(
      JSON.stringify({
        ok: expoResponse.ok,
        attempted: messages.length,
        sent,
        invalid_tokens: invalidTokens.length,
        result: expoResult,
      }),
      { status: expoResponse.ok ? 200 : 502, headers: H },
    );
  } catch (error) {
    console.error("[send-notification]", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: H },
    );
  }
});
