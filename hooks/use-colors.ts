import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";

export function useColors() {
  const colorScheme = useColorScheme();
  const scheme = (colorScheme === 'dark'? 'dark' : 'light') as 'light' | 'dark';
  return Colors[scheme];
}