import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useI18n } from "@/lib/i18n";

export default function TabLayout() {
  const { session } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom,16);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#C9A84C",
        tabBarInactiveTintColor: "#9A9A9A",
        headerShown: false,
        tabBarButton: (props: any) => <HapticTab {...props} />,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#0B0B0B",
          borderTopColor: "#2A2A2A",
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          // Las propiedades se abren desde Inicio mediante "Ver oportunidades".
          href: null,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t("map"),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: t("publish"),
          href: session ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("favorites"),
          href: session ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          // Mi cuenta se abre desde el icono de usuario del encabezado.
          href: null,
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: t("about"),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
