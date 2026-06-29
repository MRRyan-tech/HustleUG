// constants/colors.ts

export const LightColors = {
  primary: '#00C853',
  primaryDark: '#00A846',
  primaryLight: '#E8F5E9',
  black: '#0A0A0A',
  white: '#FFFFFF',
  background: '#F4F6F4',
  card: '#FFFFFF',
  text: '#0A0A0A',
  mutedText: '#607060',
  border: '#C8DCC8',
  borderDark: '#0A0A0A',
  danger: '#E53935',
  success: '#00C853',
  accent: '#00C853',
  shadowColor: '#0A0A0A',
};

// Standard dark
export const DarkColors = {
  primary: '#00C853',
  primaryDark: '#00A846',
  primaryLight: '#1B2E1B',
  black: '#F0F0F0',
  white: '#1A1A1A',
  background: '#121212',
  card: '#1E1E1E',
  text: '#F0F0F0',
  mutedText: '#A0B0A0',
  border: '#2A3A2A',
  borderDark: '#F0F0F0',
  danger: '#EF5350',
  success: '#00C853',
  accent: '#00C853',
  shadowColor: '#000000',
};

// AMOLED — pure black, maximum contrast, saves battery on OLED screens
export const AmoledColors = {
  primary: '#00C853',
  primaryDark: '#00A846',
  primaryLight: '#0A1A0A',
  black: '#FFFFFF',
  white: '#000000',
  background: '#000000',
  card: '#0D0D0D',
  text: '#FFFFFF',
  mutedText: '#888888',
  border: '#1A1A1A',
  borderDark: '#FFFFFF',
  danger: '#EF5350',
  success: '#00C853',
  accent: '#00C853',
  shadowColor: '#000000',
};

// Deep Blue — dark navy tones, premium feel
export const DeepBlueColors = {
  primary: '#00C853',
  primaryDark: '#00A846',
  primaryLight: '#0A1628',
  black: '#E8F0FE',
  white: '#0A1628',
  background: '#060E1E',
  card: '#0D1B2E',
  text: '#E8F0FE',
  mutedText: '#7A9CC0',
  border: '#1A2E44',
  borderDark: '#E8F0FE',
  danger: '#EF5350',
  success: '#00C853',
  accent: '#00C853',
  shadowColor: '#000000',
};

// TIDE — cyan + deep dark teal
export const TideColors = {
  primary: '#00D4FF',
  primaryDark: '#00A8CC',
  primaryLight: '#001F28',
  black: '#E0F8FF',
  white: '#001419',
  background: '#001419',
  card: '#001F28',
  text: '#E0F8FF',
  mutedText: '#5BBDD4',
  border: '#003344',
  borderDark: '#E0F8FF',
  danger: '#EF5350',
  success: '#00D4FF',
  accent: '#00D4FF',
  shadowColor: '#000000',
};

// ACID — neon lime + near-black green
export const AcidColors = {
  primary: '#CBFF00',
  primaryDark: '#A3CC00',
  primaryLight: '#131A00',
  black: '#F0FFB3',
  white: '#0C1100',
  background: '#0C1100',
  card: '#131A00',
  text: '#F0FFB3',
  mutedText: '#7A9900',
  border: '#1E2E00',
  borderDark: '#F0FFB3',
  danger: '#FF4444',
  success: '#CBFF00',
  accent: '#CBFF00',
  shadowColor: '#000000',
};

export type ColorScheme = typeof LightColors;
export type ThemeMode = 'light' | 'dark' | 'amoled' | 'deepblue' | 'tide' | 'acid';

export const Colors = LightColors;
