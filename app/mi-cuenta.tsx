import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/hooks/use-responsive";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ScreenContainer } from "@/components/screen-container";

type ProfileFormProps = {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  profile: NonNullable<ReturnType<typeof useAuth>["profile"]>;
};

function AccountForm({ user, profile }: ProfileFormProps) {
  const { contentMaxWidth, horizontalPadding } = useResponsive();
  const [nombre, setNombre] = useState(profile.nombre ?? "");
  const [telefono, setTelefono] = useState(profile.telefono ?? "");
  const [ciudad, setCiudad] = useState(profile.ciudad ?? "");
  const [presupuesto, setPresupuesto] = useState(profile.presupuesto != null ? String(profile.presupuesto) : "");
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    if (saving) return;
    if (!nombre.trim() || !ciudad.trim()) {
      Alert.alert("Falta información", "Nombre y ciudad son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: nombre.trim(),
          telefono: telefono.replace(/\D/g, ""),
          ciudad: ciudad.trim(),
          presupuesto: presupuesto.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      Alert.alert("Perfil actualizado", "Tus datos se guardaron correctamente.");
    } catch (error: any) {
      Alert.alert("No se pudo guardar", error?.message || "Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login" as never);
  };

  const deleteAccount = () => {
    Alert.alert(
      "Eliminar mi cuenta",
      "Se eliminarán tu cuenta, favoritos, solicitudes, notificaciones y el contenido inmobiliario que hayas enviado personalmente. Las propiedades del catálogo creadas por EYESITE para tu cuenta pueden permanecer publicadas, pero quedarán desvinculadas de ella. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar definitivamente",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke("delete-account", { body: {} });
              if (error) throw error;
              await supabase.auth.signOut();
              router.replace("/(auth)/login" as never);
            } catch (error: any) {
              Alert.alert("No se pudo eliminar", error?.message || "Inténtalo nuevamente.");
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>MI CUENTA</Text>
        <Text style={styles.subtitle}>{user.email ?? "Cuenta EYESITE"}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>MI PERFIL</Text>
          <Text style={styles.label}>CORREO</Text>
          <View style={styles.readonly}><Text style={styles.readonlyText}>{user.email ?? "—"}</Text></View>

          <Text style={styles.label}>NOMBRE</Text>
          <TextInput value={nombre} onChangeText={setNombre} style={styles.input} placeholder="Nombre completo" placeholderTextColor="#777" />

          <Text style={styles.label}>TELÉFONO</Text>
          <TextInput value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" style={styles.input} placeholder="Teléfono" placeholderTextColor="#777" />

          <Text style={styles.label}>CIUDAD / ZONA</Text>
          <TextInput value={ciudad} onChangeText={setCiudad} style={styles.input} placeholder="Ciudad" placeholderTextColor="#777" />

          <Text style={styles.label}>PRESUPUESTO</Text>
          <TextInput value={presupuesto} onChangeText={setPresupuesto} keyboardType="numeric" style={styles.input} placeholder="Presupuesto" placeholderTextColor="#777" />

          <Pressable onPress={saveProfile} disabled={saving} style={[styles.primary, saving && styles.disabled]}>
            <Text style={styles.primaryText}>{saving ? "GUARDANDO..." : "GUARDAR PERFIL"}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.menu} onPress={() => router.push("/my-properties" as never)}>
          <View><Text style={styles.menuTitle}>MIS TERRENOS</Text><Text style={styles.menuText}>Propiedades publicadas a tu nombre</Text></View><Text style={styles.arrow}>›</Text>
        </Pressable>
        <Pressable style={styles.menu} onPress={() => router.push("/my-requests" as never)}>
          <View><Text style={styles.menuTitle}>MIS SOLICITUDES</Text><Text style={styles.menuText}>Consulta pendientes, aprobadas y rechazadas</Text></View><Text style={styles.arrow}>›</Text>
        </Pressable>
        <Pressable style={styles.menu} onPress={() => router.push("/notifications" as never)}>
          <View><Text style={styles.menuTitle}>NOTIFICACIONES</Text><Text style={styles.menuText}>Mensajes y anuncios de EYESITE</Text></View><Text style={styles.arrow}>›</Text>
        </Pressable>
        <Pressable style={styles.menu} onPress={() => router.push("/settings" as never)}>
          <View><Text style={styles.menuTitle}>CONFIGURACIÓN</Text><Text style={styles.menuText}>Sesión, privacidad y preferencias</Text></View><Text style={styles.arrow}>›</Text>
        </Pressable>
        <Pressable style={styles.menu} onPress={() => router.push("/about" as never)}>
          <View><Text style={styles.menuTitle}>NOSOTROS</Text><Text style={styles.menuText}>Conoce EYESITE y nuestros medios de contacto</Text></View><Text style={styles.arrow}>›</Text>
        </Pressable>

        <Pressable onPress={signOut} style={styles.secondary}>
          <Text style={styles.secondaryText}>CERRAR SESIÓN</Text>
        </Pressable>
        <Pressable onPress={deleteAccount} style={styles.danger}>
          <Text style={styles.dangerText}>ELIMINAR MI CUENTA</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

export default function AccountScreen() {
  const { user, profile, loading } = useAuth();

  if (loading || !user || !profile) return null;

  return <AccountForm key={profile.updated_at ?? profile.id} user={user} profile={profile} />;
}

const styles = StyleSheet.create({
  container:{padding:20,paddingBottom:110},
  title:{color:"#F5F5F5",fontSize:28,fontWeight:"900",letterSpacing:1},
  subtitle:{color:"#999",fontSize:13,marginTop:5,marginBottom:20},
  card:{backgroundColor:"#171717",borderWidth:1,borderColor:"#2A2A2A",borderRadius:12,padding:16,marginBottom:14},
  sectionHeader:{flexDirection:"row",alignItems:"center",marginBottom:16},\n  sectionIcon:{width:38,height:38,borderRadius:10,backgroundColor:"#201D15",alignItems:"center",justifyContent:"center",marginRight:11},\n  sectionTitle:{color:"#F5F5F5",fontSize:15,fontWeight:"900",letterSpacing:.2},\n  sectionHint:{color:"#777",fontSize:11,marginTop:2},
  label:{color:"#999",fontSize:10,fontWeight:"800",letterSpacing:.7,marginTop:10,marginBottom:6},
  readonly:{backgroundColor:"#101010",borderRadius:8,padding:14,borderWidth:1,borderColor:"#2A2A2A"},
  readonlyText:{color:"#777"},
  input:{backgroundColor:"#101010",color:"#FFF",borderWidth:1,borderColor:"#333",borderRadius:8,padding:13},
  primary:{backgroundColor:"#C9A84C",borderRadius:8,padding:14,alignItems:"center",marginTop:16},
  primaryText:{color:"#0D0D0D",fontWeight:"900"},
  disabled:{opacity:.6},
  menu:{backgroundColor:"#171717",borderWidth:1,borderColor:"#2A2A2A",borderRadius:12,padding:16,marginBottom:9,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  menuTitle:{color:"#F5F5F5",fontWeight:"800",fontSize:13},
  menuText:{color:"#888",fontSize:11,marginTop:4},
  arrow:{color:"#C9A84C",fontSize:28},
  secondary:{borderWidth:1,borderColor:"#C9A84C",borderRadius:8,padding:14,alignItems:"center",marginTop:10},
  secondaryText:{color:"#C9A84C",fontWeight:"900"},
  danger:{borderWidth:1,borderColor:"#4A2929",borderRadius:8,padding:14,alignItems:"center",marginTop:10},
  dangerText:{color:"#E57373",fontWeight:"900"},
});
