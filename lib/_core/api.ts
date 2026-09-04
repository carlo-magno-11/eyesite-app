import { supabase } from "@/lib/supabase";

export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const u = data.user;
  return {
    id: u.id,
    openId: u.id,
    name: u.user_metadata?.name ?? u.email ?? "User",
    email: u.email ?? "",
    loginMethod: u.app_metadata?.provider ?? "email",
    lastSignedIn: u.last_sign_in_at ?? new Date().toISOString(),
  };
}

export async function logout() {
  await supabase.auth.signOut();
}