import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";

type NotificationItem = {
  id: string;
  user_id: string;
  leida?: boolean;
  created_at?: string;
  [key: string]: any;
};

const isExpoGo = Constants.executionEnvironment === "storeClient";

export function useNotifications(userId?: string) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) setItems(data ?? []);
    else console.error("[EYESITE] notifications load error:", error);

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);

    if (!userId) return () => clearTimeout(timer);

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notificaciones",
        filter: `user_id=eq.${userId}`,
      }, () => void load())
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const markRead = useCallback(async (id: string) => {
    if (!userId) return;

    const { data, error } = await supabase.rpc("marcar_notificacion_leida", {
      p_notification_id: id,
    });

    if (error) {
      console.error("[EYESITE] mark notification read error:", error);
      return;
    }

    if (!data) return;

    setItems(current =>
      current.map(notification =>
        notification.id === id ? { ...notification, leida: true } : notification,
      ),
    );
  }, [userId]);

  return {
    items,
    loading,
    unread: items.filter(notification => !notification.leida).length,
    markRead,
    refetch: load,
  };
}

export async function registerPushToken(userId?: string) {
  if (!userId || Platform.OS === "web") return null;

  if (isExpoGo) {
    console.info("[EYESITE] Push remoto omitido: Expo Go no soporta push remoto en Android.");
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "EYESITE",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (permission.status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    if (result.data) {
      const { error } = await supabase
        .from("profiles")
        .update({ expo_push_token: result.data })
        .eq("id", userId);

      if (error) console.error("[EYESITE] push token save error:", error);
    }

    return result.data ?? null;
  } catch (error) {
    console.warn("[EYESITE] push registration error:", error);
    return null;
  }
}
