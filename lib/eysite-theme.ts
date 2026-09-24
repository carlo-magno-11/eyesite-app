export const EYESITE_THEME = {
  colors: {
    background: "#0B0B0B",
    surface: "#141414",
    surfaceElevated: "#1A1A1A",
    surfaceSoft: "#211D13",
    border: "#2A2A2A",
    borderStrong: "#3A3320",
    gold: "#C9A84C",
    goldBright: "#D8B968",
    goldMuted: "#9A7626",
    text: "#F5F5F5",
    textSoft: "#D0D0D0",
    muted: "#9A9A9A",
    mutedDark: "#707070",
    success: "#7FA66B",
    danger: "#C66A6A",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
} as const;

export type EyesiteTheme = typeof EYESITE_THEME;
