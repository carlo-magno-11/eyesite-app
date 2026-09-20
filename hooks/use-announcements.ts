import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Announcement = {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  activa: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export function useAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("anuncios")
      .select("id,titulo,mensaje,tipo,activa,published_at,created_at,updated_at")
      .eq("activa", true)
      .order("published_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[EYESITE] announcements load error:", error);
      setItems([]);
    } else {
      setItems(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("public-announcements")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "anuncios",
      }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return { items, loading, refetch: load };
}
