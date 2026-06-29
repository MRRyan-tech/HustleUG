// components/JobCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '../types';
import { useTheme } from '../context/ThemeContext';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

interface JobCardProps {
  job: Job;
  onPress: (job: Job) => void;
  applied?: boolean;
}

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Cleaning: 'sparkles-outline', Construction: 'hammer-outline',
    Delivery: 'bicycle-outline',  Farming: 'leaf-outline',
    Tech: 'laptop-outline',       Repair: 'build-outline',
    'Shop Work': 'storefront-outline',
  };
  return map[category] ?? 'briefcase-outline';
}

function formatPay(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

export default function JobCard({ job, onPress, applied = false }: JobCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadowColor }]}
      onPress={() => onPress(job)}
      activeOpacity={0.88}
    >
      {/* Media strip */}
      <View style={[styles.mediaStrip, { backgroundColor: colors.primary }]}>
        <View style={[styles.categoryPill, { backgroundColor: colors.white, borderColor: colors.primaryDark }]}>
          <Ionicons name={getCategoryIcon(job.category)} size={12} color={colors.primaryDark} style={{ marginRight: 4 }} />
          <Text style={[styles.categoryText, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>{job.category}</Text>
        </View>

        {applied && (
          <View style={styles.appliedTag}>
            <Ionicons name="checkmark-circle" size={11} color="#FFF" />
            <Text style={styles.appliedTagText}>Applied</Text>
          </View>
        )}

        <View style={[styles.mediaIconBox, { backgroundColor: colors.white, borderColor: colors.primaryDark }]}>
          <Ionicons name={getCategoryIcon(job.category)} size={28} color={colors.primaryDark} />
        </View>
      </View>

      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.heading }]} numberOfLines={2}>
          {job.title}
        </Text>

        {/* Pay */}
        <View style={[styles.payBox, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
          <Ionicons name="cash-outline" size={16} color={colors.primaryDark} />
          <Text style={[styles.payLabel, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>PAY</Text>
          <Text style={[styles.payAmount, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>{formatPay(job.pay)}</Text>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={colors.mutedText} />
            <Text style={[styles.metaText, { color: colors.mutedText, fontFamily: Fonts.body }]}>{job.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.mutedText} />
            <Text style={[styles.metaText, { color: colors.mutedText, fontFamily: Fonts.body }]}>{job.timePosted}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.employerRow}>
            <Ionicons name="person-circle-outline" size={16} color={colors.mutedText} />
            <Text style={[styles.employerText, { color: colors.mutedText, fontFamily: Fonts.body }]}>{job.employerName}</Text>
            {job.isIndividual && (
              <View style={[styles.personalBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.personalBadgeText, { color: colors.primary, fontFamily: Fonts.heading }]}>🏠 Personal</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.viewBtn, { backgroundColor: colors.primary }]} onPress={() => onPress(job)}>
            <Text style={[styles.viewBtnText, { color: colors.white, fontFamily: Fonts.heading }]}>View</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12, marginBottom: Spacing.md,
    borderWidth: 1.5, overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 4,
  },
  appliedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#FFF',
  },
  appliedTagText: { color: '#FFF', fontSize: 10, fontFamily: Fonts.heading, letterSpacing: 0.5 },
  mediaStrip: { height: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  categoryText: { fontSize: 11, letterSpacing: 0.3 },
  mediaIconBox: { width: 52, height: 52, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  content: { padding: Spacing.md },
  title: { fontSize: 16, marginBottom: Spacing.sm, letterSpacing: 0.3, lineHeight: 23 },
  payBox: { borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderLeftWidth: 4 },
  payLabel: { fontSize: 10, letterSpacing: 2 },
  payAmount: { fontSize: 18, letterSpacing: 0.3 },
  metaRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1 },
  employerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  employerText: { fontSize: 12, fontStyle: 'italic' },
  personalBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 4 },
  personalBadgeText: { fontSize: 10 },
  viewBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { fontSize: 12, letterSpacing: 0.3 },
});
