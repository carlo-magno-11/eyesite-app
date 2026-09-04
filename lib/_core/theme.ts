export const Colors = {
  light: { background: "#fff", text: "#000" },
  dark: { background: "#000", text: "#fff" },
};
export const Fonts = { regular: "System" };
export const SchemeColors = Colors;
export const ThemeColors = Colors;
export type ColorScheme = "light" | "dark";
export type ThemeColorPalette = typeof Colors.light;