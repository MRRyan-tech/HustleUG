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
  /**
   * Undefined/omitted = seeker hasn't applied. Otherwise reflects the
   * real application status so the feed itself shows outcome, not just
   * "you applied at some point" -- a rejected application used to look
   * identical to a still-pending one here.
   */
  appliedStatus?: 'pending' | 'accepted' | 'rejected';
  /**
   * When set, this card renders dimmed with a "processing" overlay instead
   * of behaving as a normal interactive card — used for a job whose video
   * is still uploading or encoding. A number (0–1) shows live upload
   * progress; null means "processing" with no live percentage available
   * (upload finished, now waiting on Bunny's server-side encoding step,
   * which has no client-visible progress signal at all). Omit entirely
   * for a normal card.
   */
  processingProgress?: number | null;
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

// Memoized so FlatList doesn't re-render every visible card just because
// the parent re-rendered (e.g. typing in the search box) — only cards
// whose job data or applied status actually changed will re-render.
function JobCard({ job, onPress, appliedStatus, processingProgress }: JobCardProps) {
  const { colors } = useTheme();
  const isProcessing = processingProgress !== undefined;

  const tagConfig = appliedStatus === 'accepted'
    ? { icon: 'checkmark-circle' as const, label: 'Accepted', style: styles.appliedTagAccepted }
    : appliedStatus === 'rejected'
    ? { icon: 'close-circle' as const, label: 'Rejected', style: styles.appliedTagRejected }
    : appliedStatus === 'pending'
    ? { icon: 'checkmark-circle' as const, label: 'Applied', style: styles.appliedTag }
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadowColor },
        isProcessing && styles.cardProcessing,
      ]}
      onPress={() => { if (!isProcessing) onPress(job); }}
      activeOpacity={isProcessing ? 1 : 0.88}
      disabled={isProcessing}
    >
      {/* Media strip */}
      <View style={[styles.mediaStrip, { backgroundColor: colors.primary }]}>
        <View style={[styles.categoryPill, { backgroundColor: colors.white, borderColor: colors.primaryDark }]}>
          <Ionicons name={getCategoryIcon(job.category)} size={12} color={colors.primaryDark} style={{ marginRight: 4 }} />
          <Text style={[styles.categoryText, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>{job.category}</Text>
        </View>

        {tagConfig && (
          <View style={[styles.appliedTagBase, tagConfig.style]}>
            <Ionicons name={tagConfig.icon} size={11} color="#FFF" />
            <Text style={styles.appliedTagText}>{tagConfig.label}</Text>
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
          {!isProcessing && (
            <TouchableOpacity style={[styles.viewBtn, { backgroundColor: colors.primary }]} onPress={() => onPress(job)}>
              <Text style={[styles.viewBtnText, { color: colors.white, fontFamily: Fonts.heading }]}>View</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay} pointerEvents="none">
          <View style={styles.processingCard}>
            <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
            <Text style={styles.processingText}>
              {processingProgress === null
                ? 'Processing video...'
                : `Uploading video... ${Math.round(processingProgress * 100)}%`}
            </Text>
            {processingProgress !== null && (
              <View style={styles.processingTrack}>
                <View
                  style={[styles.processingFill, { width: `${Math.round(processingProgress * 100)}%` }]}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Custom comparator: only the fields JobCard actually renders need to be
// checked — comparing the whole `job` object by reference would defeat the
// memo any time JobsContext produces a new array (which is every fetch),
// even if this particular job's data didn't change.
export default React.memo(JobCard, (prev, next) =>
  prev.job.id === next.job.id &&
  prev.appliedStatus === next.appliedStatus &&
  prev.job.title === next.job.title &&
  prev.job.pay === next.job.pay &&
  prev.job.positions === next.job.positions &&
  prev.job.timePosted === next.job.timePosted &&
  prev.processingProgress === next.processingProgress
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12, marginBottom: Spacing.md,
    borderWidth: 1.5, overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 4,
  },
  cardProcessing: { opacity: 0.55 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  processingCard: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 10, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    alignItems: 'center', gap: 6, maxWidth: '80%',
  },
  processingText: { color: '#FFF', fontSize: 12, fontFamily: Fonts.heading, textAlign: 'center' },
  processingTrack: {
    width: 120, height: 5, borderRadius: 3, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  processingFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFF' },
  appliedTagBase: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#FFF',
  },
  appliedTag: { backgroundColor: 'rgba(0,0,0,0.35)' },
  appliedTagAccepted: { backgroundColor: 'rgba(16,124,16,0.85)' },
  appliedTagRejected: { backgroundColor: 'rgba(180,40,40,0.85)' },
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
