// components/ScreenContainer.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Set true when the screen's first child is a full-bleed colored header
   * that should extend behind the status bar (the Instagram/TikTok look)
   * instead of stopping at a hard edge below it. The screen is then
   * responsible for padding its own header's *content* by the safe-area
   * top inset itself (via useSafeAreaInsets), rather than the whole
   * screen being pushed down uniformly.
   */
  edgeToEdgeHeader?: boolean;
}

export default function ScreenContainer({ children, style, edgeToEdgeHeader = false }: ScreenContainerProps) {
  const { colors } = useTheme();
  const edges: Edge[] = edgeToEdgeHeader ? ['left', 'right'] : ['top', 'left', 'right'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={edges}>
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
});
