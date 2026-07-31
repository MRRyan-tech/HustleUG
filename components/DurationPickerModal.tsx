// components/DurationPickerModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';

export type DurationUnit = 'hours' | 'days' | 'months';

interface DurationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (totalHours: number) => void;
  /** Currently selected duration, in hours — used to pre-fill the picker. */
  initialHours: number;
}

// Uses 30-day months for a simple, predictable conversion.
const HOURS_PER_DAY = 24;
const HOURS_PER_MONTH = 24 * 30;
const MAX_HOURS = 6 * HOURS_PER_MONTH; // 6 months, the overall cap

const UNIT_HOURS: Record<DurationUnit, number> = {
  hours: 1,
  days: HOURS_PER_DAY,
  months: HOURS_PER_MONTH,
};

const UNIT_MAX: Record<DurationUnit, number> = {
  hours: 48,
  days: 180, // ~6 months
  months: 6,
};

function hoursToUnitAndAmount(totalHours: number): { unit: DurationUnit; amount: number } {
  if (totalHours >= HOURS_PER_MONTH && totalHours % HOURS_PER_MONTH === 0) {
    return { unit: 'months', amount: totalHours / HOURS_PER_MONTH };
  }
  if (totalHours >= HOURS_PER_DAY && totalHours % HOURS_PER_DAY === 0) {
    return { unit: 'days', amount: totalHours / HOURS_PER_DAY };
  }
  return { unit: 'hours', amount: totalHours };
}

export function formatDuration(totalHours: number): string {
  const { unit, amount } = hoursToUnitAndAmount(totalHours);
  const label = unit === 'hours' ? 'hour' : unit === 'days' ? 'day' : 'month';
  return `${amount} ${label}${amount === 1 ? '' : 's'}`;
}

export default function DurationPickerModal({
  visible, onClose, onConfirm, initialHours,
}: DurationPickerModalProps) {
  const { colors } = useTheme();
  const [unit, setUnit] = useState<DurationUnit>('days');
  const [amount, setAmount] = useState<number>(14);

  useEffect(() => {
    if (visible) {
      const i = hoursToUnitAndAmount(initialHours);
      setUnit(i.unit);
      setAmount(i.amount);
    }
  }, [visible, initialHours]);

  const clampAmount = (u: DurationUnit, value: number) => Math.min(Math.max(value, 1), UNIT_MAX[u]);

  const handleUnitChange = (newUnit: DurationUnit) => {
    setUnit(newUnit);
    setAmount((prev) => clampAmount(newUnit, prev));
  };

  const increment = () => setAmount((prev) => clampAmount(unit, prev + 1));
  const decrement = () => setAmount((prev) => clampAmount(unit, prev - 1));

  const handleConfirm = () => {
    const totalHours = Math.min(amount * UNIT_HOURS[unit], MAX_HOURS);
    onConfirm(totalHours);
    onClose();
  };

  const unitOptions: { key: DurationUnit; label: string }[] = [
    { key: 'hours', label: 'Hours' },
    { key: 'days', label: 'Days' },
    { key: 'months', label: 'Months' },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* No true blur library installed — this is a solid dark overlay
          consistent with the rest of the app's modals (see MediaPicker).
          Swap in expo-blur's BlurView here later if a real blur is wanted. */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.heading }]}>
            Post Duration
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            Choose how long this stays live — up to 6 months
          </Text>

          <View style={styles.unitTabs}>
            {unitOptions.map((opt) => {
              const selected = unit === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.unitTab,
                    { borderColor: selected ? colors.primary : colors.border },
                    selected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleUnitChange(opt.key)}
                >
                  <Text style={[
                    styles.unitTabText,
                    { color: selected ? '#FFFFFF' : colors.text, fontFamily: Fonts.heading },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, { borderColor: colors.border }]}
              onPress={decrement}
              disabled={amount <= 1}
            >
              <Text style={[styles.stepperBtnText, { color: amount <= 1 ? colors.mutedText : colors.text }]}>
                −
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.stepperInput, { color: colors.text, borderColor: colors.border, fontFamily: Fonts.heading }]}
              value={String(amount)}
              keyboardType="number-pad"
              onChangeText={(v) => {
                const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                setAmount(Number.isNaN(n) ? 1 : clampAmount(unit, n));
              }}
            />

            <TouchableOpacity
              style={[styles.stepperBtn, { borderColor: colors.border }]}
              onPress={increment}
              disabled={amount >= UNIT_MAX[unit]}
            >
              <Text style={[styles.stepperBtnText, { color: amount >= UNIT_MAX[unit] ? colors.mutedText : colors.text }]}>
                +
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.unitCaption, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            {unit} · max {UNIT_MAX[unit]}
          </Text>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
          >
            <Text style={[styles.confirmBtnText, { fontFamily: Fonts.heading }]}>
              Set Duration
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.danger, fontFamily: Fonts.heading }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    gap: 14,
  },
  title: { fontSize: 18, textAlign: 'center' },
  subtitle: { fontSize: 12, textAlign: 'center', marginTop: -8 },
  unitTabs: { flexDirection: 'row', gap: 8, marginTop: 4 },
  unitTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  unitTabText: { fontSize: 13 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 22, fontWeight: '600' },
  stepperInput: {
    width: 80, height: 52, borderWidth: 2, borderRadius: 12,
    textAlign: 'center', fontSize: 22,
  },
  unitCaption: { fontSize: 12, textAlign: 'center', marginTop: -6 },
  confirmBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 6 },
  cancelText: { fontSize: 13 },
});
