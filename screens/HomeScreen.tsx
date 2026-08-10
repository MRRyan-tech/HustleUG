// screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, FlatList,
  StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import JobCard from '../components/JobCard';
import CategoryChip from '../components/CategoryChip';
import EmptyState from '../components/EmptyState';
import SkeletonList from '../components/SkeletonCard';
import { categories } from '../data/mockJobs';
import { useJobs } from '../context/JobsContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { Job, Category, RecentApplicant } from '../types';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';
import { RootStackParamList } from '../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning 👋';
  if (hour < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { jobs, refreshJobs, loadMoreJobs, hasMore, loadingMore, fetchJobsByEmployer, fetchRecentApplicants, videoUploadProgress } = useJobs();
  const { profile, employerProfile, acceptedCount, appliedJobs, refreshProfile } = useUser();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myProcessingJobs, setMyProcessingJobs] = useState<Job[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshJobs(), refreshProfile()]);
    setRefreshing(false);
  }, [refreshJobs, refreshProfile]);

  // An employer's own job with a video still uploading/encoding stays
  // 'draft' (excluded from the public `jobs` feed above) until
  // video-webhook promotes it — but the poster themselves should still
  // see it, grayed out with progress, right where it'll eventually land.
  // fetchJobsByEmployer includes 'draft' jobs, so this filters down to
  // just the ones still processing.
  const loadMyProcessingJobs = useCallback(async () => {
    if (!employerProfile) {
      setMyProcessingJobs([]);
      return;
    }
    const { data } = await fetchJobsByEmployer(employerProfile.id);
    setMyProcessingJobs(data.filter((j) => j.videoStatus === 'processing'));
  }, [employerProfile, fetchJobsByEmployer]);

  // "Recent Applicants" card, employer-only -- deliberately a glanceable
  // summary refreshed on focus (same pattern as loadMyProcessingJobs
  // above), not a live realtime feed. The instant, no-refresh-needed
  // freshness for a new applicant is already covered by the sound +
  // badge (see UserContext) -- this card's job is to be the thing an
  // employer's eyes land on immediately when they open Home, not to
  // duplicate that notification mechanism.
  const [recentApplicants, setRecentApplicants] = useState<RecentApplicant[]>([]);

  const loadRecentApplicants = useCallback(async () => {
    if (!employerProfile) {
      setRecentApplicants([]);
      return;
    }
    const { data } = await fetchRecentApplicants(employerProfile.id, 5);
    setRecentApplicants(data);
  }, [employerProfile, fetchRecentApplicants]);

  useFocusEffect(
    useCallback(() => {
      loadRecentApplicants();
    }, [loadRecentApplicants])
  );

  useFocusEffect(
    useCallback(() => {
      loadMyProcessingJobs();
    }, [loadMyProcessingJobs])
  );

  // Re-check whenever the general feed changes too — that's exactly when
  // the realtime subscription in JobsContext has just refreshed things,
  // e.g. because this very job just flipped from 'draft' to 'active'.
  useEffect(() => {
    loadMyProcessingJobs();
  }, [jobs, loadMyProcessingJobs]);

  const draftJobIds = useMemo(
    () => new Set(myProcessingJobs.map((j) => j.id)),
    [myProcessingJobs]
  );

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        search === '' ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || job.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [jobs, search, selectedCategory]);

  const fullName  = profile?.full_name ?? 'there';
  const firstName = fullName.split(' ')[0];
  const initial   = firstName.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url ?? null;
  const isSeeker  = profile?.role === 'seeker';
  // Presence-based, not tied to activeRole -- an employer should see
  // this regardless of which hat they're currently switched to, so it
  // reads as an ambient "you have applicants" signal rather than
  // something you have to remember to go check by switching hats first.
  const isEmployer = !!employerProfile;

  const handleJobPress = useCallback((job: Job) => {
    navigation.navigate('JobDetails', { jobId: job.id });
  }, [navigation]);

  const renderJob = useCallback(({ item }: { item: Job }) => (
    <View style={styles.listPadding}>
      <JobCard
        job={item}
        appliedStatus={appliedJobs[item.id]}
        onPress={handleJobPress}
        processingProgress={draftJobIds.has(item.id) ? (videoUploadProgress[item.id] ?? null) : undefined}
      />
    </View>
  ), [appliedJobs, handleJobPress, draftJobIds, videoUploadProgress]);

  const keyExtractor = useCallback((job: Job) => job.id, []);

  // Rendered as a fixed sibling ABOVE the FlatList, not as part of its
  // scroll content — see the FlatList's refreshControl comment below for
  // why. This block must never move, so it can't live inside
  // ListHeaderComponent.
  const fixedHeader = (
    <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.white, fontFamily: Fonts.body }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.userName, { color: colors.white, fontFamily: Fonts.heading }]}>
            {firstName}
          </Text>
          <Text style={[styles.headline, { color: colors.white, fontFamily: Fonts.heading }]}>
            Find work today
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Briefcase button — seekers only */}
          {isSeeker && (
            <TouchableOpacity
              style={[styles.briefcaseBtn, { backgroundColor: colors.primaryDark }]}
              onPress={() => navigation.navigate('AppliedJobs')}
              activeOpacity={0.8}
            >
              <Ionicons name="briefcase" size={24} color={colors.white} />
              {acceptedCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {acceptedCount > 99 ? '99+' : acceptedCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}
            activeOpacity={0.85}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={[styles.avatar, { borderColor: colors.white }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primaryDark, borderColor: colors.white }]}>
                <Text style={[styles.avatarInitial, { color: colors.white, fontFamily: Fonts.heading }]}>
                  {initial}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const listHeader = (
    <>
      {/* ── Recent Applicants (employers only) ── */}
      {isEmployer && recentApplicants.length > 0 && (
        <View style={[styles.applicantsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.applicantsCardHeader}>
            <Text style={[styles.applicantsCardTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
              Recent Applicants
            </Text>
            <View style={[styles.applicantsCountPill, { backgroundColor: colors.primary }]}>
              <Text style={styles.applicantsCountText}>{recentApplicants.length}</Text>
            </View>
          </View>

          {recentApplicants.map((applicant) => (
            <TouchableOpacity
              key={applicant.applicationId}
              style={[styles.applicantRow, { borderTopColor: colors.border }]}
              onPress={() => navigation.navigate('Applicants', { jobId: applicant.jobId, jobTitle: applicant.jobTitle })}
              activeOpacity={0.7}
            >
              {applicant.avatarUrl ? (
                <Image
                  source={{ uri: applicant.avatarUrl }}
                  style={styles.applicantAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.applicantAvatar, styles.applicantAvatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.applicantInitial, { color: colors.primary, fontFamily: Fonts.heading }]}>
                    {applicant.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.applicantTexts}>
                <Text style={[styles.applicantName, { color: colors.text, fontFamily: Fonts.heading }]} numberOfLines={1}>
                  {applicant.name}
                </Text>
                <Text style={[styles.applicantMeta, { color: colors.mutedText, fontFamily: Fonts.body }]} numberOfLines={1}>
                  Applied for {applicant.jobTitle} · {timeAgo(applicant.appliedAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Search ── */}
      <View style={[styles.searchWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.searchIconBox, { backgroundColor: colors.primary }]}>
          <Ionicons name="search" size={22} color={colors.white} />
        </View>
        <TextInput
          style={[styles.searchInput, { color: colors.text, fontFamily: Fonts.body }]}
          placeholder="Search jobs or location..."
          placeholderTextColor={colors.mutedText}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Categories ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {categories.map((cat) => (
          <CategoryChip
            key={cat}
            title={cat}
            selected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat as Category)}
          />
        ))}
      </ScrollView>

      {/* ── Results count ── */}
      {!loading && (
        <View style={styles.resultsRow}>
          <Ionicons name="list" size={14} color={colors.primary} />
          <Text style={[styles.resultsText, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            {'  '}
            <Text style={[styles.resultsCount, { color: colors.primary, fontFamily: Fonts.heading }]}>
              {filtered.length}
            </Text>
            {' '}job{filtered.length !== 1 ? 's' : ''} available
          </Text>
        </View>
      )}
    </>
  );

  return (
    <ScreenContainer edgeToEdgeHeader>
      {fixedHeader}
      <FlatList
        style={styles.list}
        data={loading ? [] : [...myProcessingJobs, ...filtered]}
        keyExtractor={keyExtractor}
        renderItem={renderJob}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.listPadding}>
            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <EmptyState title="No jobs found" message="Try a different search or category." />
            )}
          </View>
        }
        // See FindWorkScreen for why this is fine even with an active
        // search/category filter at HustleUG's current scale.
        onEndReached={!loading && hasMore ? loadMoreJobs : undefined}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            // The green banner now renders as `fixedHeader`, a sibling
            // above this FlatList rather than its ListHeaderComponent —
            // so it's no longer part of the scroll content RefreshControl
            // drags/holds open during a refresh. This FlatList starts
            // right below that fixed banner (not behind the status bar
            // anymore), so no progressViewOffset/inset adjustment is
            // needed on either platform — the native spinner just
            // appears in its normal compact form in the small strip
            // right under the banner, and nothing else shifts.
          />
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('MainTabs', { screen: 'PostJob' } as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={[styles.fabText, { color: colors.white, fontFamily: Fonts.heading }]}>
          Post Job
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  scroll: { paddingBottom: 110 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1, gap: 2 },
  greeting: { fontSize: 14, opacity: 0.9 },
  userName: { fontSize: 22, letterSpacing: 0.5, marginTop: 1 },
  headline: { fontSize: 30, letterSpacing: 0.5, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginLeft: Spacing.md },
  briefcaseBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FF3B30', minWidth: 18, height: 18,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', lineHeight: 13 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, overflow: 'hidden' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 20 },
  applicantsCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: 12, borderWidth: 1.5, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  applicantsCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  applicantsCardTitle: { fontSize: 15 },
  applicantsCountPill: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  applicantsCountText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  applicantRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1,
  },
  applicantAvatar: { width: 40, height: 40, borderRadius: 20 },
  applicantAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  applicantInitial: { fontSize: 16 },
  applicantTexts: { flex: 1, gap: 2 },
  applicantName: { fontSize: 14 },
  applicantMeta: { fontSize: 12 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1.5, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, overflow: 'hidden',
  },
  searchIconBox: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, paddingHorizontal: Spacing.md, fontSize: 14 },
  clearBtn: { paddingHorizontal: Spacing.md },
  chipsScroll: { marginBottom: Spacing.md },
  chipsContent: { paddingHorizontal: Spacing.md, paddingRight: Spacing.lg },
  resultsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  resultsText: { fontSize: 13 },
  resultsCount: { fontSize: 15 },
  listPadding: { paddingHorizontal: Spacing.md },
  footerLoading: { paddingVertical: Spacing.lg, alignItems: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabText: { fontSize: 15, letterSpacing: 0.5 },
});
