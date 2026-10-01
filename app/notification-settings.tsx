import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/useAuth";
import { registerPushToken } from "@/hooks/use-notifications";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { useResponsive } from "@/hooks/use-responsive";
import { useI18n } from "@/lib/i18n";

export default function NotificationSettingsScreen() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [push, setPush] = useState<boolean | null>(null);
  const [inApp, setInApp] = useState<boolean | null>(null);
  const [adsPush, setAdsPush] = useState<boolean | null>(null);
  const pushValue = push ?? profile?.notificaciones_push !== false;
  const inAppValue = inApp ?? profile?.notificaciones_in_app !== false;
  const adsPushValue = adsPush ?? profile?.anuncios_push !== false;
  const [saving, setSaving] = useState(false);
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const save = async (field: "notificaciones_push" | "notificaciones_in_app" | "anuncios_push", value: boolean) => {
    if (!user?.id || saving) return;
    setSaving(true);

    let extraUpdate: Record<string, unknown> = {};

    if (field === "notificaciones_push") {
      if (value && Platform.OS !== "web") {
        const token = await registerPushToken(user.id);
        if (!token) {
          setSaving(false);
          setPush(false);
          return;
        }
        extraUpdate.expo_push_token = token;
      } else if (!value) {
        extraUpdate.expo_push_token = null;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value, ...extraUpdate })
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
      <View style={[s.header, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, width: "100%", alignSelf: "center" }]}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("notificationsSettingsTitle")}</Text>
          <Text style={s.subtitle}>{t("notificationsSettingsSubtitle")}</Text>
        </View>
      </View>

      <View style={[s.card, { marginHorizontal: horizontalPadding, maxWidth: contentMaxWidth, width: "100%", alignSelf: "center" }]}>
        <Row
          title={t("inAppNotifications")}
          description={t("inAppNotificationsDescription")}
          value={inAppValue}
          disabled={saving}
          onChange={(v) => void save("notificaciones_in_app", v)}
        />
        <Row
          title={t("pushNotifications")}
          description={t("pushNotificationsDescription")}
          value={pushValue}
          disabled={saving}
          onChange={(v) => void save("notificaciones_push", v)}
        />
        <Row
          title={t("eyesiteAnnouncements")}
          description={t("eyesiteAnnouncementsDescription")}
          value={adsPushValue}
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