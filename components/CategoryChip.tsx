// components/CategoryChip.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

interface CategoryChipProps {
  title: string;
  selected: boolean;
  onPress: () => void;
}

export default function CategoryChip({ title, selected, onPress }: CategoryChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    marginRight: Spacing.sm,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  text: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.mutedText,
    letterSpacing: 0.3,
  },
  textSelected: { color: Colors.white },
});
