// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, AmoledColors, DeepBlueColors, TideColors, AcidColors, ColorScheme, ThemeMode } from '../constants/colors';

const STORAGE_KEY      = 'hustleug_theme_mode';
const LAST_DARK_KEY    = 'hustleug_last_dark_mode';

interface ThemeContextType {
  colors: ColorScheme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LightColors,
  isDark: false,
  themeMode: 'light',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

function getColors(mode: ThemeMode, systemIsDark: boolean): ColorScheme {
  switch (mode) {
    case 'amoled':   return AmoledColors;
    case 'deepblue': return DeepBlueColors;
    case 'tide':     return TideColors;
    case 'acid':     return AcidColors;
    case 'dark':     return DarkColors;
    case 'light':    return LightColors;
    default:         return systemIsDark ? DarkColors : LightColors;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const systemIsDark = systemScheme === 'dark';
  const [themeMode, setThemeModeState] = useState<ThemeMode>(systemIsDark ? 'dark' : 'light');
  const [loaded, setLoaded] = useState(false);
  // Remember last dark mode used so FAB toggle can return to it
  const lastDarkMode = useRef<ThemeMode>('dark');

  // Load saved theme + last dark mode on startup
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LAST_DARK_KEY),
    ]).then(([saved, savedDark]) => {
      if (saved) setThemeModeState(saved as ThemeMode);
      if (savedDark) lastDarkMode.current = savedDark as ThemeMode;
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    // If switching to a dark mode, remember it
    if (mode !== 'light') {
      lastDarkMode.current = mode;
      AsyncStorage.setItem(LAST_DARK_KEY, mode).catch(() => {});
    }
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  };

  const isDark = themeMode !== 'light';
  const colors = getColors(themeMode, systemIsDark);

  // FAB toggle: light ↔ last used dark mode
  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? lastDarkMode.current : 'light');
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
