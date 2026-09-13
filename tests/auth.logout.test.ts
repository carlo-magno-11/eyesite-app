import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://xhvpvpvtkdgnnxdwdrkn.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodnB2cHZ0a2Rnbm54ZHdkcmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODk5MTEsImV4cCI6MjEwMjY2NTkxMX0.zsEMmjhbln24S25FnbKvlkic2djzON8QoXNLO8CtXA0";

describe("Supabase auth client", () => {
  it("creates an auth client without legacy server dependencies", () => {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    expect(client.auth).toBeDefined();
  });

  it("can read the current session without throwing", async () => {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await client.auth.getSession();
    expect(error).toBeNull();
  });
});
