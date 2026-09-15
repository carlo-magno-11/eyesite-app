import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Promotes only media owned by a property submission from private staging to
 * the public media bucket.  This endpoint deliberately does not approve a
 * request, update a table, or delete its source objects.
 */
const STAGING_BUCKET = "eyesite-staging";
const PUBLIC_BUCKET = "eyesite-media";
const PRIVATE_BUCKET = "eyesite-private";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MediaResult = {
  field: string;
  originalPath: string;
  publicPath?: string;
  publicUrl?: string;
  status: "promoted" | "reused" | "skipped" | "error";
  mimeType?: string;
  size?: number;
  error?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const isUrl = (value: string) => /^https?:\/\//i.test(value);
const normalisePath = (value: string) => value.replace(/^\/+/, "");

// Stable, dependency-free filename prefix. It makes retries target the same
// object while retaining the source basename for diagnostics.
const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const destinationFor = (requestId: string, sourcePath: string) => {
  const basename = sourcePath.split("/").pop()?.replace(/[^A-Za-z0-9._-]/g, "_") || "media";
  // The destination is based on the source path rather than the field. A path
  // used both as portada_url and fotos[0] is therefore copied only once.
  return `submissions/${requestId}/assets/${stableHash(sourcePath)}-${basename}`;
};

async function objectMetadata(client: ReturnType<typeof createClient>, bucket: string, path: string) {
  const slash = path.lastIndexOf("/");
  const folder = slash === -1 ? "" : path.slice(0, slash);
  const name = slash === -1 ? path : path.slice(slash + 1);
  const { data, error } = await client.storage.from(bucket).list(folder, { search: name, limit: 100 });
  if (error) return { error: error.message };
  const object = (data ?? []).find((entry) => entry.name === name);
  if (!object) return { error: "No se encontró el objeto en Storage." };
  const metadata = object.metadata ?? {};
  return {
    mimeType: typeof metadata.mimetype === "string" ? metadata.mimetype : undefined,
    size: typeof metadata.size === "number" ? metadata.size : undefined,
  };
}

async function promoteOne(
  client: ReturnType<typeof createClient>,
  requestId: string,
  field: string,
  value: unknown,
): Promise<MediaResult | null> {
  if (typeof value !== "string" || !value.trim()) return null;
  const originalPath = value.trim();

  // Existing public URLs, private documents and external URLs are intentionally
  // not copied. Only a verified relative object in staging is promotable.
  if (originalPath.startsWith(`${PRIVATE_BUCKET}/`) || isUrl(originalPath)) {
    return { field, originalPath, status: "skipped" };
  }
  if (originalPath.startsWith(`${PUBLIC_BUCKET}/`)) {
    const publicPath = originalPath.slice(PUBLIC_BUCKET.length + 1);
    return {
      field,
      originalPath,
      publicPath,
      publicUrl: client.storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath).data.publicUrl,
      status: "reused",
    };
  }

  const sourcePath = normalisePath(originalPath.replace(new RegExp(`^${STAGING_BUCKET}/`), ""));
  const metadata = await objectMetadata(client, STAGING_BUCKET, sourcePath);
  if ("error" in metadata) {
    console.error("[promote-submission-media] source lookup failed", {
      bucket: STAGING_BUCKET, path: sourcePath, error: metadata.error,
    });
    return { field, originalPath, status: "error", error: metadata.error };
  }

  const publicPath = destinationFor(requestId, sourcePath);
  const existing = await objectMetadata(client, PUBLIC_BUCKET, publicPath);
  if (!("error" in existing)) {
    return {
      field, originalPath, publicPath,
      publicUrl: client.storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath).data.publicUrl,
      status: "reused", mimeType: existing.mimeType, size: existing.size,
    };
  }

  const { error } = await client.storage.from(STAGING_BUCKET).copy(sourcePath, publicPath);
  if (error) {
    console.error("[promote-submission-media] copy failed", {
      sourceBucket: STAGING_BUCKET, sourcePath, destinationBucket: PUBLIC_BUCKET,
      publicPath, mimeType: metadata.mimeType, size: metadata.size,
      error: error.message,
    });
    return { field, originalPath, publicPath, status: "error", mimeType: metadata.mimeType, size: metadata.size, error: error.message };
  }

  const verified = await objectMetadata(client, PUBLIC_BUCKET, publicPath);
  if ("error" in verified) {
    console.error("[promote-submission-media] destination verification failed", {
      bucket: PUBLIC_BUCKET, path: publicPath, mimeType: metadata.mimeType, size: metadata.size, error: verified.error,
    });
    return { field, originalPath, publicPath, status: "error", mimeType: metadata.mimeType, size: metadata.size, error: verified.error };
  }

  return {
    field, originalPath, publicPath,
    publicUrl: client.storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath).data.publicUrl,
    status: "promoted", mimeType: verified.mimeType ?? metadata.mimeType, size: verified.size ?? metadata.size,
  };
}

function mediaValues(request: Record<string, unknown>) {
  const values: Array<[string, unknown]> = [];
  for (const field of ["fotos", "fotos_pro", "videos"]) {
    const entries = request[field];
    if (Array.isArray(entries)) entries.forEach((entry, index) => values.push([`${field}[${index}]`, entry]));
  }
  for (const field of ["video_url", "portada_url"]) values.push([field, request[field]]);
  // `imagenes` is legacy JSON. Promote only its URL/path values; never treat
  // arbitrary metadata as a file path.
  if (Array.isArray(request.imagenes)) {
    request.imagenes.forEach((entry, index) => {
      if (typeof entry === "string") values.push([`imagenes[${index}]`, entry]);
      else if (entry && typeof entry === "object") {
        const item = entry as Record<string, unknown>;
        values.push([`imagenes[${index}]`, item.path ?? item.url ?? item.publicUrl]);
      }
    });
  }
  return values;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "No autorizado" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Configuración incompleta" }, 500);

  try {
    const body = await req.json();
    const requestId = typeof body?.request_id === "string" ? body.request_id : "";
    if (!requestId) return json({ error: "request_id es obligatorio" }, 400);

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: "Sesión inválida" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) return json({ error: "No se pudo validar el rol" }, 500);
    if (profile?.role !== "admin") return json({ error: "Solo administradores" }, 403);

    const { data: submission, error: submissionError } = await admin.from("solicitudes_propiedades").select("id, estado, fotos, fotos_pro, videos, video_url, portada_url, imagenes").eq("id", requestId).maybeSingle();
    if (submissionError) return json({ error: "No se pudo leer la solicitud" }, 500);
    if (!submission) return json({ error: "Solicitud no encontrada" }, 404);

    const results = (await Promise.all(mediaValues(submission as Record<string, unknown>).map(([field, value]) => promoteOne(admin, requestId, field, value)))).filter(Boolean) as MediaResult[];
    const errors = results.filter((item) => item.status === "error");
    return json({
      request_id: requestId,
      approved: false,
      promotion_complete: errors.length === 0,
      results,
      errors,
      // The caller must not invoke the approval RPC when promotion_complete is false.
      public_media: results.filter((item) => item.publicUrl).map(({ field, originalPath, publicPath, publicUrl }) => ({ field, originalPath, publicPath, publicUrl })),
    }, errors.length ? 422 : 200);
  } catch (error) {
    console.error("[promote-submission-media] unexpected error", { error: error instanceof Error ? error.message : String(error) });
    return json({ error: "No se pudo promover los medios" }, 500);
  }
});
