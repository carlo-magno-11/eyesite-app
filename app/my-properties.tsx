import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useResponsive } from "@/hooks/use-responsive";
import { ScreenContainer } from "@/components/screen-container";

export default function MyPropertiesScreen() {
  const { user } = useAuth();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [items, setItems] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const loading = Boolean(user) && loadingData;

  useEffect(() => {
    if (!user) return;

    let alive = true;

    const load = async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("propiedades_mias")
        .select("id,codigo,titulo,tipo,municipio,precio_actual,estado,activa,portada_url,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        console.error("[my-properties]", error);
        setItems([]);
      } else {
        setItems(data || []);
      }
      setLoadingData(false);
    };

    void load();

    return () => {
      alive = false;
    };
  }, [user]);

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={[
          s.page,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>‹ Volver</Text>
        </Pressable>
        <Text style={s.title}>MIS TERRENOS</Text>

        {loading ? (
          <ActivityIndicator color="#C9A84C" />
        ) : items.length === 0 ? (
          <Text style={s.empty}>Todavía no tienes terrenos publicados.</Text>
        ) : (
          items.map((p) => (
            <Pressable
              key={p.id}
              style={s.card}
              onPress={() => router.push(("/property/" + p.id) as never)}
            >
              <Text style={s.name}>{p.titulo || "Sin título"}</Text>
              <Text style={s.meta}>
                {p.tipo || "Terreno"} · {p.municipio || "—"}
              </Text>
              <Text style={s.price}>
                {p.precio_actual != null
                  ? "$" + Number(p.precio_actual).toLocaleString("es-MX")
                  : "Precio no disponible"}
              </Text>
              <Text style={s.status}>
                {p.estado || "—"}
                {p.activa === false ? " · inactiva" : ""}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 100 },
  back: { color: "#C9A84C", fontWeight: "800", marginBottom: 18 },
  title: { color:"#F5F5F5", fontSize: 26, fontWeight: "900", marginBottom: 18 },
  card: {
    backgroundColor:"#141414",
    borderWidth: 1,
    borderColor:"#2A2A2A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  name: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  meta: { color:"#9A9A9A", marginTop: 5 },
  price: { color: "#C9A84C", fontWeight: "900", fontSize: 17, marginTop: 10 },
  status: { color:"#9A9A9A", fontSize: 11, marginTop: 6 },
  empty: { color: "#888", marginTop: 20 },
});
