// screens/ApplicantsScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { CrossAlert as Alert } from '../src/lib/crossAlert';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useTheme } from '../context/ThemeContext';
import { useJobs } from '../context/JobsContext';
import { supabase } from '../src/lib/supabase';
import { Applicant, ApplicationStatus } from '../types';
import { Fonts } from '../constants/fonts';
import Spacing from '../constants/spacing';
import { Colors } from '../constants/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type ApplicantsRouteProp = RouteProp<RootStackParamList, 'Applicants'>;

interface JobSummary {
  title: string;
  positionsAvailable: number;
  status: string;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

function formatExperience(level: string | null): string | null {
  if (!level) return null;
  const map: Record<string, string> = {
    entry: 'Entry level', mid: 'Mid level', senior: 'Senior level', executive: 'Executive level',
  };
  return map[level] ?? level;
}

const STATUS_META: Record<ApplicationStatus, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending:     { label: 'Pending',     icon: 'time-outline' },
  reviewed:    { label: 'Reviewed',    icon: 'eye-outline' },
  shortlisted: { label: 'Shortlisted', icon: 'star-outline' },
  hired:       { label: 'Hired',       icon: 'checkmark-circle' },
  rejected:    { label: 'Rejected',    icon: 'close-circle-outline' },
};

export default function ApplicantsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ApplicantsRouteProp>();
  const { jobId, jobTitle } = route.params;
  const { fetchApplicants, acceptApplicant, rejectApplicant } = useJobs();

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [job, setJob] = useState<JobSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadJobSummary = useCallback(async () => {
    const { data } = await supabase
      .from('jobs')
      .select('title, positions_available, status')
      .eq('id', jobId)
      .maybeSingle();

    if (data) {
      setJob({
        title: data.title,
        positionsAvailable: Number(data.positions_available ?? 0),
        status: data.status,
      });
    }
  }, [jobId]);

  const loadApplicants = useCallback(async () => {
    const { data, error } = await fetchApplicants(jobId);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setApplicants(data);
  }, [fetchApplicants, jobId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadJobSummary(), loadApplicants()]);
  }, [loadJobSummary, loadApplicants]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleAccept = (applicant: Applicant) => {
    if (!job || job.positionsAvailable < 1) {
      Alert.alert('No Positions Left', 'All positions for this job have already been filled.');
      return;
    }
    Alert.alert(
      'Accept Applicant',
      `Hire ${applicant.name} for this job? This will use up one of your remaining positions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setProcessingId(applicant.applicationId);
            const { error } = await acceptApplicant(applicant.applicationId);
            setProcessingId(null);
            if (error) {
              Alert.alert('Error', error);
              return;
            }
            await loadAll();
          },
        },
      ]
    );
  };

  const handleReject = (applicant: Applicant) => {
    Alert.alert(
      'Reject Applicant',
      `Reject ${applicant.name}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(applicant.applicationId);
            const { error } = await rejectApplicant(applicant.applicationId);
            setProcessingId(null);
            if (error) {
              Alert.alert('Error', error);
              return;
            }
            await loadApplicants();
          },
        },
      ]
    );
  };

  const displayTitle = job?.title ?? jobTitle ?? 'Job';
  const positionsLeft = job?.positionsAvailable ?? 0;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: Colors.black }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: Fonts.heading }]} numberOfLines={1}>
          APPLICANTS
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.jobBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.jobBarTitle, { color: colors.text, fontFamily: Fonts.heading }]} numberOfLines={1}>
          {displayTitle}
        </Text>
        <Text style={[styles.jobBarSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
          {job?.status === 'closed'
            ? 'Closed — all positions filled'
            : `${positionsLeft} position${positionsLeft === 1 ? '' : 's'} remaining`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {applicants.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
                No Applicants Yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                People who apply for this job will show up here.
              </Text>
            </View>
          ) : (
            applicants.map((applicant) => {
              const meta = STATUS_META[applicant.status];
              const isPending = applicant.status === 'pending' || applicant.status === 'reviewed' || applicant.status === 'shortlisted';
              const isHired = applicant.status === 'hired';
              const isProcessing = processingId === applicant.applicationId;
              const experience = formatExperience(applicant.experienceLevel);

              return (
                <View
                  key={applicant.applicationId}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      {applicant.avatarUrl ? (
                        <Image
                          source={{ uri: applicant.avatarUrl }}
                          style={styles.avatarImg}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={150}
                        />
                      ) : (
                        <Text style={[styles.avatarInitial, { fontFamily: Fonts.heading }]}>
                          {applicant.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.cardText}>
                      <Text style={[styles.name, { color: colors.text, fontFamily: Fonts.heading }]} numberOfLines={1}>
                        {applicant.name}
                      </Text>
                      {applicant.headline && (
                        <Text style={[styles.headline, { color: colors.mutedText, fontFamily: Fonts.body }]} numberOfLines={1}>
                          {applicant.headline}
                        </Text>
                      )}
                      <Text style={[styles.appliedAt, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                        Applied {timeAgo(applicant.appliedAt)}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isHired ? colors.success : colors.card,
                        borderColor: isHired ? colors.success : colors.mutedText,
                      },
                    ]}>
                      <Ionicons
                        name={meta.icon}
                        size={12}
                        color={isHired ? colors.white : colors.mutedText}
                      />
                      <Text style={[
                        styles.statusText,
                        { color: isHired ? colors.white : colors.mutedText, fontFamily: Fonts.heading },
                      ]}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  {(experience || applicant.skills.length > 0) && (
                    <View style={styles.chipsRow}>
                      {experience && (
                        <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.chipText, { color: colors.primaryDark, fontFamily: Fonts.body }]}>
                            {experience}
                          </Text>
                        </View>
                      )}
                      {applicant.skills.slice(0, 4).map((skill) => (
                        <View key={skill} style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                          <Text style={[styles.chipText, { color: colors.text, fontFamily: Fonts.body }]}>
                            {skill}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {applicant.coverLetter && (
                    <Text style={[styles.coverLetter, { color: colors.text, fontFamily: Fonts.body }]} numberOfLines={4}>
                      {applicant.coverLetter}
                    </Text>
                  )}

                  {applicant.phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={13} color={colors.mutedText} />
                      <Text style={[styles.contactText, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                        {' '}{applicant.phone}
                      </Text>
                    </View>
                  )}

                  {isPending && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn, { borderColor: colors.border }]}
                        onPress={() => handleReject(applicant)}
                        disabled={isProcessing}
                        activeOpacity={0.75}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color={colors.mutedText} />
                        ) : (
                          <>
                            <Ionicons name="close" size={16} color={colors.mutedText} />
                            <Text style={[styles.actionText, { color: colors.mutedText, fontFamily: Fonts.heading }]}>
                              REJECT
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.primary },
                          positionsLeft < 1 && styles.actionBtnDisabled,
                        ]}
                        onPress={() => handleAccept(applicant)}
                        disabled={isProcessing || positionsLeft < 1}
                        activeOpacity={0.85}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color={colors.white} />
                            <Text style={[styles.actionText, { color: colors.white, fontFamily: Fonts.heading }]}>
                              ACCEPT
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    paddingTop: 56,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: Colors.primary, letterSpacing: 2, flex: 1, textAlign: 'center' },
  jobBar: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    padding: Spacing.md, borderRadius: 12, borderWidth: 1.5, gap: 2,
  },
  jobBarTitle: { fontSize: 15 },
  jobBarSub: { fontSize: 12 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, letterSpacing: 0.5 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  // Cards
  card: {
    borderRadius: 12, borderWidth: 1.5, padding: Spacing.md, gap: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 3,
  },
  cardTop: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avatarImg: { width: 44, height: 44 },
  avatarInitial: { fontSize: 17, color: '#FFF' },
  cardText: { flex: 1, gap: 2 },
  name: { fontSize: 15 },
  headline: { fontSize: 12 },
  appliedAt: { fontSize: 11, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1.5, flexShrink: 0,
  },
  statusText: { fontSize: 10, letterSpacing: 0.5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipText: { fontSize: 11 },
  coverLetter: { fontSize: 13, lineHeight: 19 },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactText: { fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10,
  },
  rejectBtn: { borderWidth: 1.5 },
  actionBtnDisabled: { opacity: 0.4 },
  actionText: { fontSize: 12, letterSpacing: 0.5 },
});
