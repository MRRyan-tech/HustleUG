// screens/FindWorkScreen.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, FlatList,
  StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import JobCard from '../components/JobCard';
import CategoryChip from '../components/CategoryChip';
import EmptyState from '../components/EmptyState';
import { categories } from '../data/mockJobs';
import { useJobs } from '../context/JobsContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { Job, Category } from '../types';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';
import { RootStackParamList } from '../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type SortOption = 'recent' | 'highest' | 'lowest';

export default function FindWorkScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { jobs, refreshJobs, loadMoreJobs, hasMore, loadingMore, fetchJobsByEmployer, videoUploadProgress } = useJobs();
  const { appliedJobs, employerProfile } = useUser();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [refreshing, setRefreshing] = useState(false);
  const [myProcessingJobs, setMyProcessingJobs] = useState<Job[]>([]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshJobs();
    setRefreshing(false);
  }, [refreshJobs]);

  // See HomeScreen for the full explanation — an employer's own job with a
  // video still uploading/encoding stays 'draft' (excluded from the public
  // `jobs` feed) until video-webhook promotes it, but the poster should
  // still see it here, grayed out with progress.
  const loadMyProcessingJobs = useCallback(async () => {
    if (!employerProfile) {
      setMyProcessingJobs([]);
      return;
    }
    const { data } = await fetchJobsByEmployer(employerProfile.id);
    setMyProcessingJobs(data.filter((j) => j.videoStatus === 'processing'));
  }, [employerProfile, fetchJobsByEmployer]);

  useFocusEffect(
    useCallback(() => {
      loadMyProcessingJobs();
    }, [loadMyProcessingJobs])
  );

  useEffect(() => {
    loadMyProcessingJobs();
  }, [jobs, loadMyProcessingJobs]);

  const draftJobIds = useMemo(
    () => new Set(myProcessingJobs.map((j) => j.id)),
    [myProcessingJobs]
  );

  const filtered = useMemo(() => {
    return jobs
      .filter((job) => {
        const matchesSearch =
          search === '' ||
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.location.toLowerCase().includes(search.toLowerCase()) ||
          job.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory =
          selectedCategory === 'All' || job.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') return b.pay - a.pay;
        if (sortBy === 'lowest') return a.pay - b.pay;
        return 0;
      });
  }, [jobs, search, selectedCategory, sortBy]);

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'recent', label: 'Most Recent' },
    { key: 'highest', label: 'Highest Pay' },
    { key: 'lowest', label: 'Lowest Pay' },
  ];

  const handleJobPress = useCallback((job: Job) => {
    navigation.navigate('JobDetails', { jobId: job.id });
  }, [navigation]);

  const renderJob = useCallback(({ item }: { item: Job }) => (
    <View style={styles.listPadding}>
      <JobCard
        job={item}
        applied={!!appliedJobs[item.id]}
        onPress={handleJobPress}
        processingProgress={draftJobIds.has(item.id) ? (videoUploadProgress[item.id] ?? null) : undefined}
      />
    </View>
  ), [appliedJobs, handleJobPress, draftJobIds, videoUploadProgress]);

  const keyExtractor = useCallback((job: Job) => job.id, []);

  // Rendered as a fixed sibling ABOVE the FlatList — see HomeScreen.tsx
  // for why this can't live inside ListHeaderComponent.
  const fixedHeader = (
    <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + Spacing.md }]}>
      <Text style={[styles.title, { color: colors.white, fontFamily: Fonts.heading }]}>
        Find Work
      </Text>
    </View>
  );

  const listHeader = (
    <>
      {/* Search */}
      <View style={[styles.searchWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.searchIconBox, { backgroundColor: colors.primary }]}>
          <Ionicons name="search" size={22} color={colors.white} />
        </View>
        <TextInput
          style={[styles.searchInput, { color: colors.text, fontFamily: Fonts.body }]}
          placeholder="Job, skill, or area..."
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

      {/* Category */}
      <Text style={[styles.sectionLabel, { color: colors.mutedText, fontFamily: Fonts.heading }]}>
        Category
      </Text>
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

      {/* Sort */}
      <Text style={[styles.sectionLabel, { color: colors.mutedText, fontFamily: Fonts.heading }]}>
        Sort by
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {sortOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.sortChip,
              { borderColor: colors.border, backgroundColor: colors.card },
              sortBy === opt.key && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text style={[
              styles.sortText,
              { color: colors.mutedText, fontFamily: Fonts.heading },
              sortBy === opt.key && { color: colors.white },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <Text style={[styles.resultsLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </Text>
    </>
  );

  return (
    <ScreenContainer edgeToEdgeHeader>
      {fixedHeader}
      <FlatList
        style={styles.list}
        data={[...myProcessingJobs, ...filtered]}
        keyExtractor={keyExtractor}
        renderItem={renderJob}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.listPadding}>
            <EmptyState
              iconName="search-outline"
              title="No jobs match"
              message="Try different keywords or clear the filters."
            />
          </View>
        }
        // Note: search/category/sort filter the already-loaded jobs
        // client-side, so paging in more raw jobs while a filter is active
        // won't necessarily surface more matches immediately — it just
        // means the next unfiltered page is ready once the filter clears.
        // Fine at HustleUG's current scale; a server-side search would be
        // needed to paginate matches themselves.
        onEndReached={hasMore ? loadMoreJobs : undefined}
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
        // Virtualization tuning: job cards are tall (media strip + content),
        // so keep a modest window rather than the RN default — enough to
        // avoid blank flashes on fast scroll without holding too many
        // offscreen cards in memory on low-end devices.
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
            // See HomeScreen.tsx — the green title bar now renders as
            // `fixedHeader`, a sibling above this FlatList rather than
            // inside it, so it never moves during a refresh and no offset
            // adjustment is needed here.
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  title: { fontSize: 30, letterSpacing: 0.5 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  searchIconBox: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, paddingHorizontal: Spacing.md, fontSize: 14 },
  clearBtn: { paddingHorizontal: Spacing.md },
  sectionLabel: { fontSize: 12, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, letterSpacing: 0.3 },
  chipsScroll: { marginBottom: Spacing.md },
  chipsContent: { paddingHorizontal: Spacing.md },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: Spacing.sm,
  },
  sortText: { fontSize: 12 },
  resultsLabel: { fontSize: 13, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  listPadding: { paddingHorizontal: Spacing.md },
  footerLoading: { paddingVertical: Spacing.lg, alignItems: 'center' },
});
