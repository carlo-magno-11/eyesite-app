import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/useAuth";
import { registerPushToken, useNotifications } from "@/hooks/use-notifications";
import { useAnnouncements } from "@/hooks/use-announcements";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

type Tab = "notifications" | "announcements";
type Filter = "all" | "unread";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { items, loading, unread, markRead, refetch } = useNotifications(user?.id);
  const { items: announcements, loading: announcementsLoading } = useAnnouncements();
  const [tab, setTab] = useState<Tab>(() => params.announcement_id ? "announcements" : "notifications");
  const [filter, setFilter] = useState<Filter>("all");
  const params = useLocalSearchParams<{ announcement_id?: string }>();

  useEffect(() => {
    if (user?.id) void registerPushToken(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (params.announcement_id) {
      setTab("announcements");
      void supabase.rpc("registrar_anuncio_evento", {
        p_announcement_id: String(params.announcement_id),
        p_evento: "opened",
      });
    }
  }, [params.announcement_id]);

  const visibleNotifications = useMemo(
    () => filter === "unread" ? items.filter((item) => !item.leida) : items,
    [filter, items],
  );

  const handleNotificationPress = async (item: any) => {
    if (!item.leida) {
      await markRead(item.id);
    }

    const propertyId =
      typeof item.data?.property_id === "string"
        ? item.data.property_id
        : null;

    if (propertyId) {
      router.push({
        pathname: "/property/[id]",
        params: { id: propertyId },
      } as never);
    }
  };

  const markAllRead = async () => {
    const { error } = await supabase.rpc("marcar_todas_notificaciones_leidas");
    if (error) {
      console.error("[EYESITE] mark all notifications read error:", error);
      return;
    }
    await refetch();
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={s.h}>
        <View>
          <Text style={s.t}>COMUNICACIÓN</Text>
          <Text style={s.sub}>{tab === "notifications" ? `${unread} sin leer` : `${announcements.length} anuncios activos`}</Text>
        </View>
        <Pressable onPress={() => router.push("/notification-settings" as never)} hitSlop={10}>
          <Ionicons name="settings-outline" size={24} color="#C9A84C" />
        </Pressable>
      </View>

      <View style={s.tabs}>
        <Pressable onPress={() => setTab("notifications")} style={[s.tab, tab === "notifications" && s.tabActive]}>
          <Text style={[s.tabText, tab === "notifications" && s.tabTextActive]}>Notificaciones</Text>
        </Pressable>
        <Pressable onPress={() => setTab("announcements")} style={[s.tab, tab === "announcements" && s.tabActive]}>
          <Text style={[s.tabText, tab === "announcements" && s.tabTextActive]}>Anuncios</Text>
        </Pressable>
      </View>

      {tab === "notifications" ? (
        <>
          <View style={s.filters}>
            <Pressable onPress={() => setFilter("all")} style={[s.filter, filter === "all" && s.filterActive]}>
              <Text style={[s.filterText, filter === "all" && s.filterTextActive]}>Todas</Text>
            </Pressable>
            <Pressable onPress={() => setFilter("unread")} style={[s.filter, filter === "unread" && s.filterActive]}>
              <Text style={[s.filterText, filter === "unread" && s.filterTextActive]}>No leídas</Text>
            </Pressable>
            {unread > 0 && (
              <Pressable onPress={markAllRead} style={s.readAll}>
                <Text style={s.readAllText}>Marcar todas</Text>
              </Pressable>
            )}
          </View>

          {loading && !items.length ? (
            <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={visibleNotifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.l}
              ListEmptyComponent={
                <View style={s.e}>
                  <Text style={s.i}>🔔</Text>
                  <Text style={s.et}>No hay notificaciones</Text>
                  <Text style={s.es}>Aquí aparecerán avisos y eventos relacionados con tu cuenta.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => void handleNotificationPress(item)} style={[s.c, !item.leida && s.u]}>
                  <View style={s.row}>
                    <Text style={s.ct}>{item.titulo}</Text>
                    {!item.leida && <View style={s.dot} />}
                  </View>
                  <Text style={s.ty}>{String(item.tipo || "info").toUpperCase()}</Text>
                  <Text style={s.m}>{item.mensaje}</Text>
                  <Text style={s.d}>{item.created_at ? new Date(item.created_at).toLocaleString("es-MX") : ""}</Text>
                </Pressable>
              )}
            />
          )}
        </>
      ) : announcementsLoading && !announcements.length ? (
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.l}
          ListEmptyComponent={
            <View style={s.e}>
              <Text style={s.i}>📢</Text>
              <Text style={s.et}>No hay anuncios</Text>
              <Text style={s.es}>Cuando EYESITE publique un anuncio aparecerá aquí.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                void supabase.rpc("registrar_anuncio_evento", {
                  p_announcement_id: item.id,
                  p_evento: "opened",
                });
              }}
              style={s.c}
            >
              <View style={s.row}>
                <Text style={s.ct}>{item.titulo}</Text>
                <Ionicons name="megaphone-outline" size={18} color="#C9A84C" />
              </View>
              <Text style={s.ty}>{String(item.tipo || "informacion").toUpperCase()}</Text>
              {item.imagen_url ? <Image source={{ uri: item.imagen_url }} style={s.heroImage} /> : null}
              {Array.isArray(item.imagenes) && item.imagenes.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gallery}>
                  {item.imagenes.map((uri, index) => (
                    <Image key={`${item.id}-${index}`} source={{ uri }} style={s.galleryImage} />
                  ))}
                </ScrollView>
              ) : null}
              <Text style={s.m}>{item.mensaje}</Text>
              {item.enlace ? (
                <Pressable
                  onPress={() => {
                    void supabase.rpc("registrar_anuncio_evento", {
                      p_announcement_id: item.id,
                      p_evento: "clicked",
                    });
                    void Linking.openURL(item.enlace!);
                  }}
                  style={s.linkButton}
                >
                  <Text style={s.linkText}>{item.enlace_label || "VER MÁS"}</Text>
                </Pressable>
              ) : null}
              <Text style={s.d}>{item.published_at ? new Date(item.published_at).toLocaleString("es-MX") : ""}</Text>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  h:{padding:20,flexDirection:"row",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#2A2A2A"},
  t:{color:"#F5F5F5",fontSize:20,fontWeight:"800",letterSpacing:1},
  sub:{color:"#999",fontSize:12,marginTop:4},
  tabs:{flexDirection:"row",paddingHorizontal:16,paddingTop:14,gap:8},
  tab:{flex:1,paddingVertical:11,borderRadius:10,backgroundColor:"#171717",alignItems:"center",borderWidth:1,borderColor:"#2A2A2A"},
  tabActive:{borderColor:"#C9A84C",backgroundColor:"#211D13"},
  tabText:{color:"#888",fontSize:12,fontWeight:"700"},
  tabTextActive:{color:"#C9A84C"},
  filters:{flexDirection:"row",alignItems:"center",padding:16,gap:8},
  filter:{paddingVertical:7,paddingHorizontal:12,borderRadius:20,borderWidth:1,borderColor:"#303030"},
  filterActive:{borderColor:"#C9A84C",backgroundColor:"#211D13"},
  filterText:{color:"#888",fontSize:11,fontWeight:"700"},
  filterTextActive:{color:"#C9A84C"},
  readAll:{marginLeft:"auto",paddingVertical:7,paddingHorizontal:10},
  readAllText:{color:"#C9A84C",fontSize:11,fontWeight:"700"},
  l:{padding:16,paddingBottom:100},
  c:{backgroundColor:"#171717",borderWidth:1,borderColor:"#2A2A2A",borderRadius:14,padding:16,marginBottom:12},
  u:{borderColor:"#C9A84C"},
  row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:"#C9A84C"},
  ct:{color:"#FFF",fontSize:16,fontWeight:"700",flex:1},
  ty:{color:"#C9A84C",fontSize:10,fontWeight:"800",marginTop:6},
  m:{color:"#C0C0C0",fontSize:14,lineHeight:21,marginTop:8},
  d:{color:"#777",fontSize:10,marginTop:10},
  heroImage:{width:"100%",height:190,borderRadius:10,marginTop:12,backgroundColor:"#222"},gallery:{gap:8,paddingTop:10},galleryImage:{width:150,height:100,borderRadius:9,backgroundColor:"#222"},linkButton:{marginTop:14,alignSelf:"flex-start",paddingVertical:9,paddingHorizontal:14,borderRadius:9,backgroundColor:"#C9A84C"},linkText:{color:"#0E0E0E",fontSize:11,fontWeight:"800"},e:{alignItems:"center",padding:50},
  i:{fontSize:50},
  et:{color:"#FFF",fontSize:18,fontWeight:"700",marginTop:15},
  es:{color:"#888",textAlign:"center",marginTop:8,lineHeight:20}
});