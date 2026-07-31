// screens/JobDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Alert, Linking, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import MediaCollage from '../components/MediaCollage';
import EmployerProfileModal from '../components/EmployerProfileModal';
import { useTheme } from '../context/ThemeContext';
import { useJobs } from '../context/JobsContext';
import { useUser } from '../context/UserContext';
import { MediaItem } from '../components/MediaPicker';
import { Job } from '../types';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetails'>;

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Cleaning: 'sparkles-outline',
    Construction: 'hammer-outline',
    Delivery: 'bicycle-outline',
    Farming: 'leaf-outline',
    Tech: 'laptop-outline',
    Repair: 'build-outline',
    'Shop Work': 'storefront-outline',
  };
  return map[category] ?? 'briefcase-outline';
}

export default function JobDetailsScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { colors } = useTheme();
  const { jobs, fetchJobById } = useJobs();
  const { profile, seekerProfile, employerProfile, appliedJobs, applyForJob } = useUser();
  const [employerModalVisible, setEmployerModalVisible] = useState(false);
  const [applying, setApplying] = useState(false);
  const [fallbackJob, setFallbackJob] = useState<Job | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const job = jobs.find((j) => j.id === jobId) ?? fallbackJob;

  // The feed only holds whatever's been paged in so far — if this job
  // isn't there (deep link, push notification, or it just hasn't been
  // scrolled to yet this session), fetch it directly rather than showing
  // a false "not found".
  useEffect(() => {
    if (job || fallbackLoading) return;
    setFallbackLoading(true);
    fetchJobById(jobId).then(({ data }) => {
      setFallbackJob(data);
      setFallbackLoading(false);
    });
    // Only re-run if the target job or the paginated list changes — not on
    // every fallbackLoading flip (that's read, not a dependency trigger).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, job]);

  if (!job) {
    if (fallbackLoading) {
      return (
        <ScreenContainer>
          <View style={styles.notFound}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </ScreenContainer>
      );
    }

    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.text, fontFamily: Fonts.heading }]}>
            Job not found.
          </Text>
          <AppButton label="Go Back" onPress={() => navigation.goBack()} variant="outline" />
        </View>
      </ScreenContainer>
    );
  }

  const mediaItems: MediaItem[] = job.media
    ? job.media
    : job.mediaUrl
    ? [{ uri: job.mediaUrl, type: 'photo' }]
    : [];

  const handleCall = () => {
    Linking.openURL(`tel:${job.contact}`).catch(() =>
      Alert.alert('Error', 'Unable to open phone dialer.')
    );
  };

  const handleLocation = () => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.location)}`).catch(() =>
      Alert.alert('Error', 'Could not open maps.')
    );
  };

  const isSeeker = profile?.role === 'seeker';
  const alreadyApplied = !!appliedJobs[job.id];

  // Block self-application: check if this user's employer profile posted the job
  // We match by employerName since that's what the mapped Job shape carries.
  // The RLS policy enforces this at DB level too — this is just the UI signal.
  const isOwnJob = !!employerProfile && (
    job.employerName === ((employerProfile as any).company_name ?? profile?.full_name)
    || job.employerName === profile?.full_name
  );

  const handleApply = () => {
    if (!seekerProfile) {
      Alert.alert('Complete Your Profile', 'Please finish setting up your seeker profile before applying.');
      return;
    }
    if (alreadyApplied) {
      Alert.alert('Already Applied', 'You have already applied for this job.');
      return;
    }
    Alert.alert(
      'Apply for Job',
      `Send your application to ${job.employerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplying(true);
            const { error } = await applyForJob(job.id);
            setApplying(false);
            if (error) {
              Alert.alert('Could Not Apply', error);
              return;
            }
            Alert.alert(
              'Applied! ✅',
              `${job.employerName} can now see your application. You can track its status in My Applications.`
            );
          },
        },
      ]
    );
  };

  // Decide what to show in the action area
  const renderApplySection = () => {
    // Employer mode — not a seeker hat
    if (!isSeeker) {
      return (
        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.mutedText} />
          <Text style={[styles.noticeText, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            {'  '}Switch to a seeker account to apply for jobs.
          </Text>
        </View>
      );
    }

    // Seeker hat but this user posted the job — block it
    if (isOwnJob) {
      return (
        <View style={[styles.notice, styles.ownJobNotice, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.primary, fontFamily: Fonts.body }]}>
            {'  '}You posted this job. You can't apply to your own listings.
          </Text>
        </View>
      );
    }

    // Normal seeker — show apply button
    return (
      <AppButton
        label={applying ? 'Applying...' : alreadyApplied ? '✅  Applied' : '✅  Apply for this Job'}
        onPress={handleApply}
        style={styles.btnSpacing}
        disabled={applying || alreadyApplied}
      />
    );
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Top bar */}
        <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary, fontFamily: Fonts.heading }]}>
              Back
            </Text>
          </TouchableOpacity>
          <View style={[styles.categoryPill, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Ionicons name={getCategoryIcon(job.category)} size={12} color={colors.primaryDark} />
            <Text style={[styles.categoryText, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>
              {' '}{job.category}
            </Text>
          </View>
        </View>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: colors.primary }]}>
          <View style={[styles.bannerIconBox, { backgroundColor: colors.white, borderColor: colors.primaryDark }]}>
            <Ionicons name={getCategoryIcon(job.category)} size={48} color={colors.primaryDark} />
          </View>
        </View>

        <View style={[styles.body, { backgroundColor: colors.background }]}>

          <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.heading }]}>
            {job.title}
          </Text>

          {job.isIndividual && (
            <View style={[styles.personalBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Ionicons name="home-outline" size={14} color={colors.primary} />
              <Text style={[styles.personalBannerText, { color: colors.primary, fontFamily: Fonts.heading }]}>
                {'  '}Personal Hire — posted by an individual, not a company
              </Text>
            </View>
          )}

          <View style={[styles.payHero, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
            <Ionicons name="cash-outline" size={20} color={colors.primaryDark} />
            <View style={{ marginLeft: Spacing.sm }}>
              <Text style={[styles.payLabel, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>Pay</Text>
              <Text style={[styles.payAmount, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>
                UGX {job.pay.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.mutedText, fontFamily: Fonts.heading }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.text, fontFamily: Fonts.bodyBold }]}>{job.location}</Text>
            </View>
            <View style={[styles.infoBox, { marginLeft: Spacing.sm, backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.mutedText, fontFamily: Fonts.heading }]}>Posted</Text>
              <Text style={[styles.infoValue, { color: colors.text, fontFamily: Fonts.bodyBold }]}>{job.timePosted}</Text>
            </View>
            <View style={[styles.infoBox, { marginLeft: Spacing.sm, backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.mutedText, fontFamily: Fonts.heading }]}>Positions</Text>
              <Text style={[styles.infoValue, { color: colors.text, fontFamily: Fonts.bodyBold }]}>{job.positions ?? 1}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>About this job</Text>
            <Text style={[styles.description, { color: colors.text, fontFamily: Fonts.body }]}>{job.description}</Text>
          </View>

          <MediaCollage media={mediaItems} />

          <TouchableOpacity
            style={[styles.employerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setEmployerModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.employerAvatarWrap}>
              {job.employerAvatarUri ? (
                <Image
                  source={{ uri: job.employerAvatarUri }}
                  style={[styles.employerAvatar, { borderColor: colors.primary }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : (
                <View style={[styles.employerAvatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.employerAvatarText, { color: colors.white, fontFamily: Fonts.heading }]}>
                    {job.employerName.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.employerInfo}>
              <View style={styles.employerNameRow}>
                <Text style={[styles.employerName, { color: colors.text, fontFamily: Fonts.heading }]}>
                  {job.employerName}
                </Text>
                {job.isIndividual && (
                  <View style={[styles.miniBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.miniBadgeText, { color: colors.primary, fontFamily: Fonts.heading }]}>🏠</Text>
                  </View>
                )}
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={13} color={colors.mutedText} />
                <Text style={[styles.employerContact, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                  {' '}{job.contact || 'No contact provided'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {renderApplySection()}

          <AppButton label="📞  Call / Message Employer" onPress={handleCall} variant="dark" style={styles.btnSpacing} />
          <AppButton label="📍  Preview Location" onPress={handleLocation} variant="outline" />
        </View>
      </ScrollView>

      <EmployerProfileModal
        visible={employerModalVisible}
        onClose={() => setEmployerModalVisible(false)}
        employerName={job.employerName}
        employerRating={job.employerRating}
        employerAvatarUri={job.employerAvatarUri}
        contact={job.contact}
        onJobPress={(jobId) => navigation.replace('JobDetails', { jobId })}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  notFoundText: { fontSize: 18 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  backText: { fontSize: 14 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: Spacing.md,
    paddingVertical: 5, borderWidth: 1,
  },
  categoryText: { fontSize: 12 },
  banner: { height: 140, alignItems: 'center', justifyContent: 'center' },
  bannerIconBox: {
    width: 90, height: 90, borderRadius: 18,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
  },
  body: { padding: Spacing.md },
  title: { fontSize: 22, marginBottom: Spacing.sm, lineHeight: 30, textDecorationLine: 'underline' },
  personalBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, borderWidth: 1.5,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  personalBannerText: { fontSize: 12, flexShrink: 1 },
  payHero: {
    borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.md,
    borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center',
  },
  payLabel: { fontSize: 11, marginBottom: 2 },
  payAmount: { fontSize: 26 },
  infoGrid: { flexDirection: 'row', marginBottom: Spacing.md },
  infoBox: { flex: 1, borderRadius: 10, borderWidth: 1.5, padding: Spacing.sm, gap: 3 },
  infoLabel: { fontSize: 10 },
  infoValue: { fontSize: 13 },
  section: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: 15, marginBottom: Spacing.sm },
  description: { fontSize: 14, lineHeight: 24 },
  employerCard: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1.5,
    padding: Spacing.md, marginBottom: Spacing.lg,
    alignItems: 'center', gap: Spacing.md,
  },
  employerAvatarWrap: { flexShrink: 0 },
  employerAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, overflow: 'hidden' },
  employerAvatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  employerAvatarText: { fontSize: 22 },
  employerInfo: { flex: 1, gap: 4 },
  employerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  employerName: { fontSize: 15 },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  miniBadgeText: { fontSize: 11 },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  employerContact: { fontSize: 12 },
  notice: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1.5,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  ownJobNotice: {},
  noticeText: { fontSize: 12, flexShrink: 1 },
  btnSpacing: { marginBottom: Spacing.md },
});
