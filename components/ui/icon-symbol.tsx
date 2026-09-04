import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation (tabs)
  "house.fill": "home",
  "building.2.fill": "apartment",
  "plus.circle.fill": "add-circle",
  "heart.fill": "favorite",
  "person.fill": "person",
  // Actions
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "magnifyingglass": "search",
  "heart": "favorite-border",
  "square.and.arrow.up": "share",
  "phone.fill": "phone",
  "phone": "phone",
  "envelope.fill": "email",
  "map.fill": "map",
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
  "photo.badge.plus": "add-photo-alternate",
  "trash.fill": "delete",
  "pencil": "edit",
  "checkmark": "check",
  "info.circle": "info",
  "star.fill": "star",
  "location.fill": "location-on",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "line.3.horizontal.decrease": "filter-list",
  "slider.horizontal.3": "tune",
  "globe": "language",
  "logo.whatsapp": "chat",
  "play.circle.fill": "play-circle-fill",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}