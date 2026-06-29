// components/PhoneInput.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import * as Localization from 'expo-localization';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';
import Spacing from '../constants/spacing';

// Country code map — expand as needed
const COUNTRY_CODES: Record<string, string> = {
  UG: '+256', KE: '+254', TZ: '+255', RW: '+250',
  NG: '+234', GH: '+233', ZA: '+27',  ET: '+251',
  US: '+1',   GB: '+44',  IN: '+91',  DEFAULT: '+256',
};

function getDialCode(): string {
  try {
    const locale = Localization.getLocales?.()[0];
    const region = locale?.regionCode ?? '';
    // Uganda-first: default to +256 unless device is explicitly set to another country
    const AFRICAN_CODES: Record<string, string> = {
      UG: '+256', KE: '+254', TZ: '+255', RW: '+250',
      NG: '+234', GH: '+233', ZA: '+27',  ET: '+251',
    };
    // Only use detected code if it's a recognised African country
    // Otherwise fall back to Uganda +256 (the app's home market)
    return AFRICAN_CODES[region] ?? '+256';
  } catch {
    return '+256';
  }
}

interface PhoneInputProps {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  error?: string;
  placeholder?: string;
}

export default function PhoneInput({
  label, value, onChangeText, error, placeholder = '700 000 000',
}: PhoneInputProps) {
  const { colors } = useTheme();
  const [dialCode, setDialCode] = useState(COUNTRY_CODES.DEFAULT);

  useEffect(() => {
    const code = getDialCode();
    setDialCode(code);
    // Pre-fill dial code if field is empty
    if (!value) onChangeText(code + ' ');
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.heading }]}>
        {label}
      </Text>
      <View style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.border },
      ]}>
        {/* Dial code badge */}
        <View style={[styles.dialBadge, { backgroundColor: colors.primaryLight, borderRightColor: colors.border }]}>
          <Text style={[styles.dialText, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>
            {dialCode}
          </Text>
        </View>
        {/* Number input */}
        <TextInput
          value={value.startsWith(dialCode) ? value.slice(dialCode.length).trimStart() : value}
          onChangeText={(t) => onChangeText(dialCode + ' ' + t.replace(/^\s+/, ''))}
          style={[styles.input, { color: colors.text, fontFamily: Fonts.body }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
        <Ionicons name="call-outline" size={18} color={colors.mutedText} style={{ marginRight: Spacing.sm }} />
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.danger, fontFamily: Fonts.body }]}>⚠ {error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: { fontSize: 13, marginBottom: Spacing.xs, letterSpacing: 0.3 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10,
    overflow: 'hidden', minHeight: 52,
  },
  dialBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRightWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialText: { fontSize: 14, letterSpacing: 0.5 },
  input: { flex: 1, fontSize: 15, paddingHorizontal: Spacing.sm },
  error: { fontSize: 12, marginTop: Spacing.xs },
});
