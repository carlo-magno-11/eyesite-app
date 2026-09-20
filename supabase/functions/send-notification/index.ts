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

    const body = await req.json();
    const targetUserId = body.user_id ? String(body.user_id) : null;
    const targetUserIds = Array.isArray(body.user_ids) ? body.user_ids.map((id: unknown) => String(id)).filter(Boolean) : [];

    let query = adminClient
      .from("profiles")
      .select("id,expo_push_token")
      .eq("estado", "activa")
      .not("expo_push_token", "is", null)
      .neq("expo_push_token", "");

    if (targetUserIds.length) {
      query = query.in("id", targetUserIds);
    } else if (targetUserId) {
      query = query.eq("id", targetUserId);
    } else {
      query = query.neq("role", "admin");
    }

    const { data: rows, error: rowsError } = await query;
    if (rowsError) throw rowsError;

    const messages = (rows || [])
      .filter((row: any) => typeof row.expo_push_token === "string" && row.expo_push_token.startsWith("ExponentPushToken["))
      .map((row: any) => ({
        to: row.expo_push_token,
        sound: "default",
        title: String(body.titulo || "EYESITE"),
        body: String(body.mensaje || ""),
        data: { tipo: String(body.tipo || "informacion") },
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

    tickets.forEach((ticket: any, index: number) => {
      if (ticket?.status === "ok") {
        sent += 1;
      } else if (ticket?.details?.error === "DeviceNotRegistered") {
        const token = messages[index]?.to;
        if (token) invalidTokens.push(token);
      }
    });

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
