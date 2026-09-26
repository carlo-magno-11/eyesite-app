import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useResponsive } from "@/hooks/use-responsive";
import { useI18n } from "@/lib/i18n";
import { ScreenContainer } from "@/components/screen-container";

export default function MyRequestsScreen() {
  const { user } = useAuth();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { t, language } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const loading = Boolean(user) && loadingData;

  useEffect(() => {
    if (!user) return;

    let alive = true;

    const load = async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("solicitudes_propiedades")
        .select("id,titulo,tipo,municipio,precio_actual,estado,motivo_rechazo,created_at,updated_at,propiedad_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        console.error("[my-requests]", error);
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
          <Text style={s.back}>{t("back")}</Text>
        </Pressable>
        <Text style={s.title}>{t("myRequests")}</Text>

        {loading ? (
          <ActivityIndicator color="#C9A84C" />
        ) : items.length === 0 ? (
          <Text style={s.empty}>{t("noRequests")}</Text>
        ) : (
          items.map((p) => (
            <View key={p.id} style={s.card}>
              <Text style={s.name}>{p.titulo || t("noTitle")}</Text>
              <Text style={s.meta}>
                {p.tipo || t("land")} · {p.municipio || t("noLocationDash")}
              </Text>
              <Text style={s.status}>{t("requestStatus")}: {p.estado || t("noLocationDash")}</Text>
              {p.motivo_rechazo ? (
                <Text style={s.reason}>{t("rejectionReason")}: {p.motivo_rechazo}</Text>
              ) : null}
              {p.propiedad_id && p.estado === "aprobada" ? (
                <Pressable
                  onPress={() => router.push(("/property/" + p.propiedad_id) as never)}
                >
                  <Text style={s.link}>{t("viewPublication")}</Text>
                </Pressable>
              ) : null}
            </View>
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
  status: { color: "#C9A84C", fontWeight: "800", marginTop: 10 },
  reason: { color: "#E57373", fontSize: 12, marginTop: 8 },
  link: { color: "#C9A84C", fontWeight: "900", marginTop: 12 },
  empty: { color:"#9A9A9A", marginTop: 20 },
});
