// components/SkeletonCard.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Spacing from '../constants/spacing';

function ShimmerBox({ width, height, style }: {
  width: number | string;
  height: number;
  style?: any;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: colors.border, borderRadius: 6, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonJobCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.mediaStrip, { backgroundColor: colors.primaryLight }]}>
        <ShimmerBox width={80} height={20} />
        <ShimmerBox width={48} height={48} style={{ borderRadius: 10 }} />
      </View>
      <View style={styles.content}>
        <ShimmerBox width="90%" height={16} style={{ marginBottom: 6 }} />
        <ShimmerBox width="60%" height={16} style={{ marginBottom: Spacing.sm }} />
        <View style={[styles.payBox, { backgroundColor: colors.primaryLight }]}>
          <ShimmerBox width={40} height={12} />
          <ShimmerBox width={120} height={20} />
        </View>
        <View style={styles.metaRow}>
          <ShimmerBox width={100} height={12} />
          <ShimmerBox width={80} height={12} />
        </View>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <ShimmerBox width={100} height={12} />
          <ShimmerBox width={60} height={32} style={{ borderRadius: 8 }} />
        </View>
      </View>
    </View>
  );
}

export default function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonJobCard key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, marginBottom: Spacing.md, borderWidth: 1.5, overflow: 'hidden', elevation: 2 },
  mediaStrip: { height: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md },
  content: { padding: Spacing.md },
  payBox: { borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1 },
});
