// screens/FindWorkScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView,
  StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  const { jobs, refreshJobs } = useJobs();
  const { appliedJobs } = useUser();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshJobs();
    setRefreshing(false);
  }, [refreshJobs]);

  const filtered = jobs
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

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'recent', label: 'Most Recent' },
    { key: 'highest', label: 'Highest Pay' },
    { key: 'lowest', label: 'Lowest Pay' },
  ];

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >

        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[styles.title, { color: colors.white, fontFamily: Fonts.heading }]}>
            Find Work
          </Text>
        </View>

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

        <View style={styles.listPadding}>
          {filtered.length === 0 ? (
            <EmptyState
              iconName="search-outline"
              title="No jobs match"
              message="Try different keywords or clear the filters."
            />
          ) : (
            filtered.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                applied={!!appliedJobs[job.id]}
                onPress={(j: Job) => navigation.navigate('JobDetails', { jobId: j.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
});
