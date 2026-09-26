import { useState } from "react";
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export default function ResetPasswordScreen() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (password.length < 8 || !/[A-ZÁÉÍÓÚÑ]/.test(password) || !/\d/.test(password)) {
      Alert.alert(t("invalidPassword"), t("invalidPasswordDescription"));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t("passwordMismatch"), t("passwordMismatchDescription"));
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("El enlace de recuperación ya no es válido. Solicita uno nuevo.");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Recovery creates a valid Supabase session. End that recovery session
      // before returning to login so a completed reset cannot bypass the
      // normal email/profile/approval gates through an already-authenticated
      // client session.
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      Alert.alert(t("passwordUpdated"), t("passwordUpdatedDescription"), [
        { text: "Continuar", onPress: () => router.replace("/(auth)/login" as never) },
      ]);
    } catch (error: any) {
      console.error("[reset-password]", error);
      Alert.alert(t("passwordUpdateFailed"), error?.message || t("passwordUpdateFailedDescription"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EYESITE</Text>
      <Text style={styles.title}>{t("newPassword")}</Text>
      <Text style={styles.subtitle}>{t("newPasswordSubtitle")}</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t("newPasswordPlaceholder")}
        placeholderTextColor="#777"
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
        editable={!saving}
      />
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t("confirmPasswordPlaceholder")}
        placeholderTextColor="#777"
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
        editable={!saving}
      />

      <Pressable onPress={save} disabled={saving} style={[styles.button, saving && styles.disabled]}>
        {saving ? <ActivityIndicator color="#0E0E0E" /> : <Text style={styles.buttonText}>{t("savePassword")}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"#0E0E0E",padding:24,justifyContent:"center"},
  logo:{color:"#C9A84C",textAlign:"center",fontWeight:"900",letterSpacing:3,marginBottom:28},
  title:{color:"#FFF",fontSize:25,fontWeight:"900",textAlign:"center"},
  subtitle:{color:"#999",textAlign:"center",marginTop:10,marginBottom:24},
  input:{height:54,borderWidth:1,borderColor:"#333",borderRadius:10,backgroundColor:"#171717",color:"#FFF",paddingHorizontal:15,marginBottom:14},
  button:{height:54,borderRadius:10,backgroundColor:"#C9A84C",alignItems:"center",justifyContent:"center",marginTop:6},
  disabled:{opacity:.6},
  buttonText:{color:"#0E0E0E",fontWeight:"900",letterSpacing:1},
});
