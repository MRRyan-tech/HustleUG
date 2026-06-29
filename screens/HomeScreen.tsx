// screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import { Job, Category } from '../types';
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

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const { jobs } = useJobs();
  const { profile, acceptedCount, appliedJobs } = useUser();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const filtered = jobs.filter((job) => {
    const matchesSearch =
      search === '' ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || job.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const fullName  = profile?.full_name ?? 'there';
  const firstName = fullName.split(' ')[0];
  const initial   = firstName.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url ?? null;
  const isSeeker  = profile?.role === 'seeker';

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
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
                  <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: colors.white }]} />
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

        {/* ── Job list ── */}
        <View style={styles.listPadding}>
          {loading ? (
            <SkeletonList count={4} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No jobs found" message="Try a different search or category." />
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
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabText: { fontSize: 15, letterSpacing: 0.5 },
});
