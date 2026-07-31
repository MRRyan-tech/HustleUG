// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';
import { LightColors, DarkColors, AmoledColors, DeepBlueColors, TideColors, AcidColors, ColorScheme, ThemeMode } from '../constants/colors';

// Local cache only — used before login (auth screens have no profile yet) and
// as a fast, offline-friendly value while we wait on the network read from
// the profile. Once signed in, the `profiles.theme_mode` column is the
// source of truth so the same theme follows the user across devices.
const STORAGE_KEY   = 'hustleug_theme_mode';
const LAST_DARK_KEY = 'hustleug_last_dark_mode';

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
  // Which signed-in user (if any) we should persist theme changes to
  const authUserIdRef = useRef<string | null>(null);

  // 1. Load the local cache immediately on startup — fast, works offline,
  //    and is what auth screens use since there's no profile yet.
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

  // 2. Once we know who's signed in, the profile's saved theme_mode takes
  //    over as the source of truth (this is what makes it follow the user
  //    across devices instead of being stuck per-device).
  useEffect(() => {
    const applyFromProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('theme_mode')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (error || !data?.theme_mode) return;

      const mode = data.theme_mode as ThemeMode;
      setThemeModeState(mode);
      AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
      if (mode !== 'light') {
        lastDarkMode.current = mode;
        AsyncStorage.setItem(LAST_DARK_KEY, mode).catch(() => {});
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      authUserIdRef.current = session?.user?.id ?? null;
      if (session?.user) applyFromProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authUserIdRef.current = session?.user?.id ?? null;
      if (session?.user) applyFromProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const persistToProfile = (mode: ThemeMode) => {
    const userId = authUserIdRef.current;
    if (!userId) return; // not signed in yet — local cache is all we can do
    supabase
      .from('profiles')
      .update({ theme_mode: mode })
      .eq('auth_user_id', userId)
      .then(({ error }) => {
        if (error) console.error('Failed to save theme preference:', error.message);
      });
  };

  const setThemeMode = (mode: ThemeMode) => {
    // If switching to a dark mode, remember it
    if (mode !== 'light') {
      lastDarkMode.current = mode;
      AsyncStorage.setItem(LAST_DARK_KEY, mode).catch(() => {});
    }
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
    persistToProfile(mode);
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
