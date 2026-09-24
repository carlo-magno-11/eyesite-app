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
  const [presupuesto, setPresupuesto] = useState(
    profile.presupuesto != null ? String(profile.presupuesto) : "",
  );
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
      Alert.alert(
        "No se pudo guardar",
        error?.message || "Inténtalo nuevamente.",
      );
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
              const { error } = await supabase.functions.invoke(
                "delete-account",
                { body: {} },
              );
              if (error) throw error;
              await supabase.auth.signOut();
              router.replace("/(auth)/login" as never);
            } catch (error: any) {
              Alert.alert(
                "No se pudo eliminar",
                error?.message || "Inténtalo nuevamente.",
              );
            }
          },
        },
      ],
    );
  };

  const menuItems = [
    {
      icon: "map-outline" as const,
      title: "MIS TERRENOS",
      text: "Propiedades publicadas a tu nombre",
      route: "/my-properties",
    },
    {
      icon: "document-text-outline" as const,
      title: "MIS SOLICITUDES",
      text: "Consulta pendientes, aprobadas y rechazadas",
      route: "/my-requests",
    },
    {
      icon: "notifications-outline" as const,
      title: "NOTIFICACIONES",
      text: "Mensajes y anuncios de EYESITE",
      route: "/notifications",
    },
    {
      icon: "settings-outline" as const,
      title: "CONFIGURACIÓN",
      text: "Sesión, privacidad y preferencias",
      route: "/settings",
    },
    {
      icon: "business-outline" as const,
      title: "NOSOTROS",
      text: "Conoce EYESITE y nuestros medios de contacto",
      route: "/about",
    },
  ];

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      containerClassName="bg-background"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(nombre.trim() || "E").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CUENTA EYESITE</Text>
            <Text style={styles.title}>Mi cuenta</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {user.email ?? "Cuenta EYESITE"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="person-outline" size={20} color="#C9A84C" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Datos personales</Text>
              <Text style={styles.sectionHint}>
                Mantén tu información actualizada
              </Text>
            </View>
          </View>

          <Text style={styles.label}>CORREO</Text>
          <View style={styles.readonly}>
            <Text style={styles.readonlyText}>{user.email ?? "—"}</Text>
          </View>

          <Text style={styles.label}>NOMBRE</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#777"
          />

          <Text style={styles.label}>TELÉFONO</Text>
          <TextInput
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="Teléfono"
            placeholderTextColor="#777"
          />

          <Text style={styles.label}>CIUDAD / ZONA</Text>
          <TextInput
            value={ciudad}
            onChangeText={setCiudad}
            style={styles.input}
            placeholder="Ciudad"
            placeholderTextColor="#777"
          />

          <Text style={styles.label}>PRESUPUESTO</Text>
          <TextInput
            value={presupuesto}
            onChangeText={setPresupuesto}
            keyboardType="numeric"
            style={styles.input}
            placeholder="Presupuesto"
            placeholderTextColor="#777"
          />

          <Pressable
            onPress={saveProfile}
            disabled={saving}
            style={({ pressed }) => [
              styles.primary,
              saving && styles.disabled,
              pressed && !saving && styles.pressed,
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={19} color="#0D0D0D" />
            <Text style={styles.primaryText}>
              {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.groupTitle}>ACCESOS RÁPIDOS</Text>
        <View style={styles.menuGroup}>
          {menuItems.map((item) => (
            <Pressable
              key={item.route}
              style={({ pressed }) => [
                styles.menu,
                pressed && styles.menuPressed,
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={19} color="#C9A84C" />
              </View>
              <View style={styles.menuCopy}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuText}>{item.text}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#777" />
            </Pressable>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#C9A84C" />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Tu cuenta está protegida</Text>
            <Text style={styles.infoText}>
              EYESITE mantiene separados tus datos personales del catálogo
              público de propiedades.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={18} color="#C9A84C" />
          <Text style={styles.secondaryText}>CERRAR SESIÓN</Text>
        </Pressable>

        <Pressable
          onPress={deleteAccount}
          style={({ pressed }) => [styles.danger, pressed && styles.dangerPressed]}
        >
          <Ionicons name="trash-outline" size={17} color="#E57373" />
          <Text style={styles.dangerText}>ELIMINAR MI CUENTA</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

export default function AccountScreen() {
  const { user, profile, loading } = useAuth();

  if (loading || !user || !profile) return null;

  return (
    <AccountForm
      key={profile.updated_at ?? profile.id}
      user={user}
      profile={profile}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
    paddingTop: 24,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#201D15",
    borderWidth: 1,
    borderColor: "#C9A84C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  avatarText: {
    color: "#C9A84C",
    fontSize: 21,
    fontWeight: "900",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: "#C9A84C",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: "#F5F5F5",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  subtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 3,
  },
  card: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 14,
    padding: 17,
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#201D15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: "#F5F5F5",
    fontSize: 15,
    fontWeight: "900",
  },
  sectionHint: {
    color: "#777",
    fontSize: 11,
    marginTop: 2,
  },
  label: {
    color: "#999",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 10,
    marginBottom: 6,
  },
  readonly: {
    backgroundColor: "#101010",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  readonlyText: {
    color: "#777",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#101010",
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 13,
    fontSize: 14,
  },
  primary: {
    backgroundColor: "#C9A84C",
    borderRadius: 9,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
    flexDirection: "row",
    gap: 8,
  },
  primaryText: {
    color: "#0D0D0D",
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.78,
  },
  groupTitle: {
    color: "#777",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  menuGroup: {
    marginBottom: 18,
  },
  menu: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    padding: 13,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  menuPressed: {
    opacity: 0.78,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#201D15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    color: "#F5F5F5",
    fontWeight: "800",
    fontSize: 13,
  },
  menuText: {
    color: "#888",
    fontSize: 11,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  infoCopy: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    color: "#D8D8D8",
    fontSize: 12,
    fontWeight: "800",
  },
  infoText: {
    color: "#777",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  secondary: {
    borderWidth: 1,
    borderColor: "#C9A84C",
    borderRadius: 9,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: {
    color: "#C9A84C",
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  danger: {
    borderWidth: 1,
    borderColor: "#4A2929",
    borderRadius: 9,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
    flexDirection: "row",
    gap: 8,
  },
  dangerPressed: {
    opacity: 0.75,
  },
  dangerText: {
    color: "#E57373",
    fontWeight: "800",
    fontSize: 12,
  },
});
