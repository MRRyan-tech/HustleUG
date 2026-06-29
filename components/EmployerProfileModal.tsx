// components/EmployerProfileModal.tsx
import React from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, Image, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useJobs } from '../context/JobsContext';
import { Job } from '../types';
import { Fonts } from '../constants/fonts';
import Spacing from '../constants/spacing';
import { Colors } from '../constants/colors';

interface EmployerProfileModalProps {
  visible: boolean;
  onClose: () => void;
  employerName: string;
  employerRating: number;
  employerAvatarUri?: string | null;
  contact: string;
  onJobPress: (jobId: string) => void;
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

export default function EmployerProfileModal({
  visible, onClose, employerName, employerRating,
  employerAvatarUri, contact, onJobPress,
}: EmployerProfileModalProps) {
  const { colors } = useTheme();
  const { jobs } = useJobs();

  // All active jobs posted by this employer
  const employerJobs = jobs.filter((j) => j.employerName === employerName);

  const handleCall = () => {
    Linking.openURL(`tel:${contact}`).catch(() =>
      Alert.alert('Error', 'Could not open phone dialer.')
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
              Employer Profile
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Avatar + name */}
            <View style={styles.profileSection}>
              {employerAvatarUri ? (
                <Image source={{ uri: employerAvatarUri }} style={[styles.avatar, { borderColor: colors.primary }]} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarInitial, { fontFamily: Fonts.heading }]}>
                    {employerName.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={[styles.employerName, { color: colors.text, fontFamily: Fonts.heading }]}>
                {employerName}
              </Text>

              {/* Star rating */}
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= Math.round(employerRating) ? 'star' : 'star-outline'}
                    size={18}
                    color={colors.primary}
                  />
                ))}
                <Text style={[styles.ratingNum, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                  {'  '}{employerRating.toFixed(1)}
                </Text>
              </View>

              {/* Stats row */}
              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statVal, { color: colors.text, fontFamily: Fonts.heading }]}>
                    {employerJobs.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                    Jobs Posted
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statVal, { color: colors.text, fontFamily: Fonts.heading }]}>
                    {employerRating.toFixed(1)}★
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                    Rating
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statVal, { color: colors.text, fontFamily: Fonts.heading }]}>
                    {contact}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                    Contact
                  </Text>
                </View>
              </View>

              {/* Call button */}
              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: colors.primary }]}
                onPress={handleCall}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={[styles.callBtnText, { fontFamily: Fonts.heading }]}>
                  Call {employerName.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Other jobs by this employer */}
            {employerJobs.length > 0 && (
              <View style={styles.jobsSection}>
                <Text style={[styles.jobsSectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
                  Jobs by {employerName.split(' ')[0]}
                </Text>
                {employerJobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={[styles.jobRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => { onClose(); onJobPress(job.id); }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.jobRowIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name={getCategoryIcon(job.category)} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.jobRowText}>
                      <Text style={[styles.jobRowTitle, { color: colors.text, fontFamily: Fonts.heading }]} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={[styles.jobRowMeta, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                        UGX {job.pay.toLocaleString()} · {job.location}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 3, borderColor: Colors.black,
    height: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.md },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  sheetTitle: { fontSize: 20, letterSpacing: 0.3 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: Spacing.lg },
  profileSection: { alignItems: 'center', gap: Spacing.md },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, overflow: 'hidden' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, color: '#FFF' },
  employerName: { fontSize: 22, letterSpacing: 0.5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingNum: { fontSize: 14 },
  statsRow: {
    flexDirection: 'row', width: '100%',
    borderWidth: 1.5, borderRadius: 12, overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 4 },
  statVal: { fontSize: 14, letterSpacing: 0.3 },
  statLabel: { fontSize: 10, textAlign: 'center' },
  statDivider: { width: 1.5 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
    borderRadius: 12, width: '100%', justifyContent: 'center',
  },
  callBtnText: { fontSize: 15, color: '#FFF', letterSpacing: 0.5 },
  jobsSection: { gap: Spacing.sm },
  jobsSectionTitle: { fontSize: 15, letterSpacing: 0.3 },
  jobRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1.5, borderRadius: 10, padding: Spacing.md,
  },
  jobRowIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  jobRowText: { flex: 1, gap: 3 },
  jobRowTitle: { fontSize: 14 },
  jobRowMeta: { fontSize: 12 },
});
