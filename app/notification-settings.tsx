import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";

export default function NotificationSettingsScreen() {
  const { user, profile } = useAuth();
  const [push, setPush] = useState(true);
  const [inApp, setInApp] = useState(true);
  const [adsPush, setAdsPush] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPush(profile.notificaciones_push !== false);
    setInApp(profile.notificaciones_in_app !== false);
    setAdsPush(profile.anuncios_push !== false);
  }, [profile]);

  const save = async (field: "notificaciones_push" | "notificaciones_in_app" | "anuncios_push", value: boolean) => {
    if (!user?.id || saving) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.error("[EYESITE] notification preference error:", error);
      return;
    }

    if (field === "notificaciones_push") setPush(value);
    if (field === "notificaciones_in_app") setInApp(value);
    if (field === "anuncios_push") setAdsPush(value);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>NOTIFICACIONES</Text>
          <Text style={s.subtitle}>Controla cómo quieres recibir comunicaciones de EYESITE.</Text>
        </View>
      </View>

      <View style={s.card}>
        <Row
          title="Notificaciones dentro de EYESITE"
          description="Avisos de tu cuenta, propiedades y eventos."
          value={inApp}
          disabled={saving}
          onChange={(v) => void save("notificaciones_in_app", v)}
        />
        <Row
          title="Notificaciones push"
          description="Avisos que llegan al teléfono aunque EYESITE esté cerrada."
          value={push}
          disabled={saving}
          onChange={(v) => void save("notificaciones_push", v)}
        />
        <Row
          title="Anuncios de EYESITE"
          description="Permite recibir por push novedades y anuncios generales."
          value={adsPush}
          disabled={saving}
          onChange={(v) => void save("anuncios_push", v)}
        />
      </View>

      {saving ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 20 }} /> : null}
    </ScreenContainer>
  );
}

function Row({ title, description, value, disabled, onChange }: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: "#333", true: "#806A2D" }}
        thumbColor={value ? "#C9A84C" : "#999"}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:{padding:20,flexDirection:"row",alignItems:"center",gap:12},
  back:{width:38,height:38,borderRadius:19,backgroundColor:"#171717",alignItems:"center",justifyContent:"center"},
  backText:{color:"#C9A84C",fontSize:30,lineHeight:32},
  title:{color:"#F5F5F5",fontSize:20,fontWeight:"800",letterSpacing:1},
  subtitle:{color:"#888",fontSize:12,lineHeight:18,marginTop:5},
  card:{margin:16,marginTop:4,paddingHorizontal:16,backgroundColor:"#171717",borderWidth:1,borderColor:"#2A2A2A",borderRadius:14},
  row:{minHeight:92,paddingVertical:16,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:"#2A2A2A"},
  rowTitle:{color:"#FFF",fontSize:14,fontWeight:"700"},
  rowDescription:{color:"#888",fontSize:11,lineHeight:17,marginTop:5},
});