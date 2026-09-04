import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export type User = {
  id: string;
  openId: string;
  name: string;
  email: string;
  loginMethod?: string;
  lastSignedIn?: Date;
};

const USER_KEY = "eyesite_user";
const TOKEN_KEY = "eyesite_session";

const storage = {
  getItem: async (k: string) => {
    if (Platform.OS === "web") return localStorage.getItem(k);
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    return AsyncStorage.getItem(k);
  },
  setItem: async (k: string, v: string) => {
    if (Platform.OS === "web") return localStorage.setItem(k, v);
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    return AsyncStorage.setItem(k, v);
  },
  removeItem: async (k: string) => {
    if (Platform.OS === "web") return localStorage.removeItem(k);
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    return AsyncStorage.removeItem(k);
  }
};

export async function getSessionToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
export async function removeSessionToken() {
  await storage.removeItem(TOKEN_KEY);
}
export async function getUserInfo(): Promise<User | null> {
  const raw = await storage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return { ...parsed, lastSignedIn: parsed.lastSignedIn ? new Date(parsed.lastSignedIn) : undefined };
  } catch { return null; }
}
export async function setUserInfo(user: User) {
  await storage.setItem(USER_KEY, JSON.stringify(user));
}
export async function clearUserInfo() {
  await storage.removeItem(USER_KEY);
}