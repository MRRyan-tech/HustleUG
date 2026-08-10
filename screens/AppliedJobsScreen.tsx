// screens/AppliedJobsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { CrossAlert as Alert } from '../src/lib/crossAlert';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useTheme } from '../context/ThemeContext';
import { useJobs } from '../context/JobsContext';
import { useUser } from '../context/UserContext';
import { Fonts } from '../constants/fonts';
import Spacing from '../constants/spacing';
import { Colors } from '../constants/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Cleaning: 'sparkles-outline', Construction: 'hammer-outline',
    Delivery: 'bicycle-outline',  Farming: 'leaf-outline',
    Tech: 'laptop-outline',       Repair: 'build-outline',
    'Shop Work': 'storefront-outline',
  };
  return map[category] ?? 'briefcase-outline';
}

export default function AppliedJobsScreen() {
  const { colors } = useTheme();
  const { jobs } = useJobs();
  const { profile, appliedJobs, clearAccepted, withdrawApplication } = useUser();
  const navigation = useNavigation<NavProp>();

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const isSeeker = profile?.role === 'seeker';

  useEffect(() => {
    if (isSeeker) clearAccepted();
  }, []);

  // If an employer somehow lands here, show a blocked screen
  if (!isSeeker) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: Colors.black }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: Fonts.heading }]}>
            MY APPLICATIONS
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.blocked}>
          <View style={[styles.blockedIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.blockedTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
            Employer Account
          </Text>
          <Text style={[styles.blockedSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            This section is for job seekers only. Use your profile to manage posted jobs.
          </Text>
          <TouchableOpacity
            style={[styles.backHomeBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={[styles.backHomeBtnText, { fontFamily: Fonts.heading }]}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const appliedList = jobs.filter((j) => appliedJobs[j.id]);

  const handleWithdraw = (jobId: string, jobTitle: string) => {
    Alert.alert(
      'Withdraw Application',
      `Remove your application for "${jobTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setWithdrawingId(jobId);
            const { error } = await withdrawApplication(jobId);
            setWithdrawingId(null);
            if (error) Alert.alert('Error', error);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.black }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: Fonts.heading }]}>
          MY APPLICATIONS
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {appliedList.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="briefcase-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
              No Applications Yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
              Jobs you apply for will appear here with their status.
            </Text>
          </View>
        ) : (
          appliedList.map((job) => {
            const status = appliedJobs[job.id];
            const isWithdrawing = withdrawingId === job.id;

            const statusConfig = status === 'accepted'
              ? { label: 'Accepted', icon: 'checkmark-circle' as const, color: colors.primary }
              : status === 'rejected'
              ? { label: 'Rejected', icon: 'close-circle' as const, color: colors.danger }
              : { label: 'Pending', icon: 'time-outline' as const, color: colors.mutedText };
            const isNeutral = status !== 'accepted' && status !== 'rejected';

            return (
              <TouchableOpacity
                key={job.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
                activeOpacity={0.88}
              >
                <View style={[styles.stripe, { backgroundColor: isNeutral ? colors.border : statusConfig.color }]} />

                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name={getCategoryIcon(job.category)} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={[styles.jobTitle, { color: colors.text, fontFamily: Fonts.heading }]} numberOfLines={2}>
                        {job.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={12} color={colors.mutedText} />
                        <Text style={[styles.metaText, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                          {' '}{job.location}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={[styles.payBadge, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="cash-outline" size={13} color={colors.primaryDark} />
                      <Text style={[styles.payText, { color: colors.primaryDark, fontFamily: Fonts.heading }]}>
                        {' '}UGX {job.pay.toLocaleString()}
                      </Text>
                    </View>

                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: isNeutral ? colors.card : statusConfig.color,
                        borderColor: isNeutral ? colors.mutedText : statusConfig.color },
                    ]}>
                      <Ionicons
                        name={statusConfig.icon}
                        size={13}
                        color={isNeutral ? colors.mutedText : colors.white}
                      />
                      <Text style={[
                        styles.statusText,
                        { color: isNeutral ? colors.mutedText : colors.white, fontFamily: Fonts.heading },
                      ]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.employerRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.employerAvatar, { backgroundColor: colors.primary }]}>
                      {job.employerAvatarUri ? (
                        <Image
                          source={{ uri: job.employerAvatarUri }}
                          style={styles.employerImg}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={150}
                        />
                      ) : (
                        <Text style={[styles.employerInitial, { fontFamily: Fonts.heading }]}>
                          {job.employerName.charAt(0)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.employerName, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                      {job.employerName}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                  </View>

                  {status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.withdrawBtn, { borderColor: colors.border }]}
                      onPress={() => handleWithdraw(job.id, job.title)}
                      disabled={isWithdrawing}
                      activeOpacity={0.75}
                    >
                      {isWithdrawing ? (
                        <ActivityIndicator size="small" color={colors.mutedText} />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={15} color={colors.mutedText} />
                          <Text style={[styles.withdrawText, { color: colors.mutedText, fontFamily: Fonts.heading }]}>
                            WITHDRAW
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 16, color: Colors.primary, letterSpacing: 2 },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  // Blocked state
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md },
  blockedIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  blockedTitle: { fontSize: 20, letterSpacing: 0.5 },
  blockedSub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  backHomeBtn: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: 10 },
  backHomeBtnText: { color: '#FFF', fontSize: 14, letterSpacing: 1 },
  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, letterSpacing: 0.5 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  // Cards
  card: {
    borderRadius: 12, borderWidth: 1.5, flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 3,
  },
  stripe: { width: 5 },
  cardBody: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  cardTop: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  iconBox: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardText: { flex: 1, gap: 4 },
  jobTitle: { fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: 8 },
  payText: { fontSize: 13 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1.5,
  },
  statusText: { fontSize: 11, letterSpacing: 0.5 },
  employerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderTopWidth: 1, paddingTop: Spacing.sm,
  },
  employerAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  employerImg: { width: 24, height: 24 },
  employerInitial: { fontSize: 11, color: '#FFF' },
  employerName: { flex: 1, fontSize: 12 },
  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, marginTop: 2,
  },
  withdrawText: { fontSize: 11, letterSpacing: 1 },
});
