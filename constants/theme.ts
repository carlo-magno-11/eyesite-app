export type ColorScheme = 'light' | 'dark';

export type ThemeColorPalette = {
  background: string;
  text: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  [key: string]: string;
};

export const Colors: Record<ColorScheme, ThemeColorPalette> = {
  light: {
    background: '#00000',
    text: '#11181C',
    tint: '#D4AF37',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    background: '#151718',
    text: '#ECEDEE',
    tint: '#fff',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};