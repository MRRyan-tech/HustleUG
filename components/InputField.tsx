// components/InputField.tsx
import React from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TextInputProps, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export default function InputField({
  label, error, containerStyle,
  rightIcon, onRightIconPress,
  style,
  ...props
}: InputFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
      <View style={[
        styles.inputWrap,
        {
          backgroundColor: colors.inputBackground ?? colors.card,
          borderColor: error ? colors.danger : colors.border,
        },
      ]}>
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            // Merge caller style AFTER base so color: colors.text wins
            // unless caller explicitly overrides it
            style,
            // Re-assert text color so multiline / style overrides never break it
            { color: colors.text },
          ]}
          placeholderTextColor={colors.mutedText}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.iconBtn}>
            <Ionicons name={rightIcon} size={20} color={colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>⚠ {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Fonts.body,
  },
  iconBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: Spacing.xs,
  },
});
