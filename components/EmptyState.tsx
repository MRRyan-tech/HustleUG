// components/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

export default function EmptyState({
  iconName = 'search-outline',
  title,
  message,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name={iconName} size={40} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
  iconBox: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primaryLight,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
});
