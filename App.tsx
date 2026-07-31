// App.tsx
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { LuckiestGuy_400Regular } from '@expo-google-fonts/luckiest-guy';
import { Merriweather_400Regular, Merriweather_700Bold } from '@expo-google-fonts/merriweather';
import AppNavigation from './navigation';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { JobsProvider } from './context/JobsContext';
import { UserProvider } from './context/UserContext';
import AppLoadingScreen from './components/AppLoadingScreen';

function AppInner() {
  const { isDark } = useTheme();
  const [showLoader, setShowLoader] = useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <AppNavigation />
      {showLoader && (
        <AppLoadingScreen onFinish={() => setShowLoader(false)} />
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    LuckiestGuy_400Regular,
    Merriweather_400Regular,
    Merriweather_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoading}>
        <Text style={styles.fontLoadingText}>HUSTLE UG</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <JobsProvider>
          <AppInner />
        </JobsProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  fontLoading: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontLoadingText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00C853',
    letterSpacing: 4,
  },
});
