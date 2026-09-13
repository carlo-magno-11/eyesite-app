import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * To support static rendering, hydration is represented as an external-store
 * snapshot instead of synchronously setting state from an effect.
 */
const subscribe = () => () => {};

export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return "light";
}
