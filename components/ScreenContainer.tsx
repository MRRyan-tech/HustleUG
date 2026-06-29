// components/ScreenContainer.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenContainer({ children, style }: ScreenContainerProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
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
