import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration error" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);

  const token = authHeader.slice("Bearer ".length).trim();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return json({ error: "Invalid session" }, 401);

  const userId = user.id;

  try {
    // EYESITE distingue entre contenido personal enviado por el usuario y
    // propiedades del catálogo publicadas por un administrador "para" un usuario.
    const { data: associatedProperties, error: propertyError } = await admin
      .from("propiedades")
      .select("id, solicitud_origen")
      .eq("user_id", userId);
    if (propertyError) throw propertyError;

    const userSubmittedPropertyIds = (associatedProperties ?? [])
      .filter((property) => property.solicitud_origen !== null)
      .map((property) => property.id);

    const catalogPropertyIds = (associatedProperties ?? [])
      .filter((property) => property.solicitud_origen === null)
      .map((property) => property.id);

    const stagingRoot = userId;
    const { data: stagingFolders, error: folderError } = await admin.storage
      .from("eyesite-staging")
      .list(stagingRoot, { limit: 1000 });
    if (folderError && !/not found/i.test(folderError.message || "")) throw folderError;

    const stagingPaths: string[] = [];
    for (const entry of stagingFolders ?? []) {
      const prefix = `${stagingRoot}/${entry.name}`;
      const { data: files, error } = await admin.storage.from("eyesite-staging").list(prefix, { limit: 1000 });
      if (error) throw error;
      for (const file of files ?? []) stagingPaths.push(`${prefix}/${file.name}`);
    }
    if (stagingPaths.length) {
      const { error } = await admin.storage.from("eyesite-staging").remove(stagingPaths);
      if (error) throw error;
    }

    const collectPropertyStoragePaths = async (bucket: string, propertyId: string) => {
      const paths: string[] = [];
      const prefix = `properties/${propertyId}`;

      const { data: entries, error } = await admin.storage
        .from(bucket)
        .list(prefix, { limit: 1000 });

      if (error && !/not found/i.test(error.message || "")) throw error;

      for (const entry of entries ?? []) {
        const entryPath = `${prefix}/${entry.name}`;
        const { data: children, error: childError } = await admin.storage
          .from(bucket)
          .list(entryPath, { limit: 1000 });

        if (childError && !/not found/i.test(childError.message || "")) throw childError;

        for (const child of children ?? []) {
          paths.push(`${entryPath}/${child.name}`);
        }
      }

      return paths;
    };

    const publicPaths: string[] = [];
    const privatePaths: string[] = [];

    // Only user-submitted properties are deleted. Admin-created catalog
    // properties remain published and keep their media.
    for (const propertyId of userSubmittedPropertyIds) {
      publicPaths.push(
        ...(await collectPropertyStoragePaths("eyesite-media", propertyId)),
      );
      privatePaths.push(
        ...(await collectPropertyStoragePaths("eyesite-private", propertyId)),
      );
    }

    if (publicPaths.length) {
      const { error } = await admin.storage.from("eyesite-media").remove(publicPaths);
      if (error) throw error;
    }

    if (privatePaths.length) {
      const { error } = await admin.storage.from("eyesite-private").remove(privatePaths);
      if (error) throw error;
    }

    if (userSubmittedPropertyIds.length) {
      const { error } = await admin
        .from("propiedades")
        .delete()
        .in("id", userSubmittedPropertyIds);
      if (error) throw error;
    }

    // Admin-created catalog properties are not personal account content.
    // Keep them available in EYESITE, but remove the deleted user's association.
    if (catalogPropertyIds.length) {
      const { error } = await admin
        .from("propiedades")
        .update({ user_id: null })
        .in("id", catalogPropertyIds);
      if (error) throw error;
    }

    const deletes = [
      admin.from("favoritos").delete().eq("user_id", userId),
      admin.from("notificaciones").delete().eq("user_id", userId),
      admin.from("solicitudes_propiedades").delete().eq("user_id", userId),
      admin.from("profiles").delete().eq("id", userId),
    ];
    for (const operation of deletes) {
      const { error } = await operation;
      if (error) throw error;
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    return json({ ok: true });
  } catch (error) {
    console.error("delete-account failed", error);
    return json({
      error: "No fue posible completar la eliminación. No se eliminó la cuenta de Auth si ocurrió un error antes de ese paso.",
    }, 500);
  }
});
