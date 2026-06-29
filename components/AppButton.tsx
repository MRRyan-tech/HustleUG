// components/AppButton.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../constants/colors';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'dark';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        variant === 'dark' && styles.dark,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.78}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.white} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'outline' && styles.outlineLabel,
            variant === 'danger' && styles.dangerLabel,
            variant === 'dark' && styles.darkLabel,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  outline: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  dark: {
    backgroundColor: Colors.text,
  },
  disabled: { opacity: 0.5 },
  label: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },
  outlineLabel: { color: Colors.primary },
  dangerLabel: { color: Colors.white },
  darkLabel: { color: Colors.white },
});
