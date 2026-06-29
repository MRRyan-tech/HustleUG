// components/LoadingState.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

export default function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.mutedText,
    letterSpacing: 0.5,
  },
});
