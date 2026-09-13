import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    // Capture the user's property IDs before deleting rows.
    const { data: ownedProperties, error: propertyError } = await admin
      .from("propiedades")
      .select("id")
      .eq("user_id", userId);
    if (propertyError) throw propertyError;

    // Remove user-generated media from private staging.
    const stagingRoot = `${userId}`;
    const { data: stagingFolders, error: folderError } = await admin.storage
      .from("eyesite-staging")
      .list(stagingRoot, { limit: 1000 });
    if (!folderError && stagingFolders) {
      const stagingPaths: string[] = [];
      for (const entry of stagingFolders) {
        const prefix = `${stagingRoot}/${entry.name}`;
        const { data: files } = await admin.storage.from("eyesite-staging").list(prefix, { limit: 1000 });
        for (const file of files ?? []) stagingPaths.push(`${prefix}/${file.name}`);
      }
      if (stagingPaths.length) {
        await admin.storage.from("eyesite-staging").remove(stagingPaths);
      }
    }

    // Remove public media belonging to properties created by this account.
    const publicPaths: string[] = [];
    for (const property of ownedProperties ?? []) {
      const prefix = `properties/${property.id}`;
      const { data: folders } = await admin.storage.from("eyesite-media").list(prefix, { limit: 1000 });
      for (const entry of folders ?? []) {
        const { data: files } = await admin.storage.from("eyesite-media").list(`${prefix}/${entry.name}`, { limit: 1000 });
        for (const file of files ?? []) publicPaths.push(`${prefix}/${entry.name}/${file.name}`);
      }
    }
    if (publicPaths.length) {
      await admin.storage.from("eyesite-media").remove(publicPaths);
    }

    // Remove application data first; auth.users is deleted last.
    await admin.from("favoritos").delete().eq("user_id", userId);
    await admin.from("notificaciones").delete().eq("user_id", userId);
    await admin.from("solicitudes_propiedades").delete().eq("user_id", userId);
    await admin.from("propiedades").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("delete-account failed", error);
    return new Response(JSON.stringify({ error: "No fue posible completar la eliminación. Contacta a EYESITE." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
