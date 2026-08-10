// screens/ProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Switch, ActivityIndicator, RefreshControl,
} from 'react-native';
import { CrossAlert as Alert } from '../src/lib/crossAlert';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import PhoneInput from '../components/PhoneInput';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useJobs } from '../context/JobsContext';
import { Job } from '../types';
import { ThemeMode } from '../constants/colors';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';
import { supabase } from '../src/lib/supabase';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Constants ────────────────────────────────────────────────────────────────
const SKILLS_OPTIONS = [
  'Cleaning', 'Driving', 'Cooking', 'Security', 'Construction',
  'Plumbing', 'Electrical', 'Carpentry', 'Welding', 'Tailoring',
  'Farming', 'Teaching', 'Nursing', 'Accounting', 'Sales',
  'IT Support', 'Design', 'Marketing', 'Delivery', 'Mechanics',
];

const EXPERIENCE_LEVELS = [
  { value: 'entry',     label: 'Entry Level',  sub: '0 – 2 years' },
  { value: 'mid',       label: 'Mid Level',    sub: '3 – 5 years' },
  { value: 'senior',    label: 'Senior',       sub: '6 – 10 years' },
  { value: 'executive', label: 'Executive',    sub: '10+ years' },
];

const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Mbarara',
  'Gulu', 'Lira', 'Masaka', 'Entebbe', 'Soroti', 'Arua', 'Other',
];

// ─── Small shared chip ────────────────────────────────────────────────────────
function Chip({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[
        chipS.chip,
        { borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primaryLight : colors.card },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[chipS.text, { color: active ? colors.primary : colors.mutedText, fontFamily: Fonts.heading }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const chipS = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, margin: 3 },
  text: { fontSize: 12 },
});

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { profile, seekerProfile, employerProfile, activeRole, refreshProfile } = useUser();
  const [saving, setSaving] = useState(false);

  // Basic info
  const [fullName, setFullName]   = useState(profile?.full_name ?? '');
  const [phone, setPhone]         = useState(profile?.phone ?? '');
  // Seeker-specific
  const [headline, setHeadline]   = useState((seekerProfile as any)?.headline ?? '');
  const [bio, setBio]             = useState((seekerProfile as any)?.bio ?? '');
  const [skills, setSkills]       = useState<string[]>((seekerProfile as any)?.skills ?? []);
  const [experience, setExperience] = useState((seekerProfile as any)?.experience_level ?? '');
  const [district, setDistrict]   = useState(profile?.district ?? '');
  // Employer-specific
  const [companyName, setCompanyName] = useState(employerProfile?.company_name ?? '');

  // Use the currently active hat, not profile.role — a dual-hat account's
  // profile.role can be stale relative to which hat they're using right now.
  const isSeeker = activeRole === 'seeker';
  const isEmployer = activeRole === 'employer' && employerProfile !== null;

  const toggleSkill = (s: string) =>
    setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    if (isEmployer && !companyName.trim()) {
      Alert.alert('Required', 'Company/business name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      // Update base profile
      await supabase.from('profiles').update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        district: district || null,
      }).eq('id', profile!.id);

      // Update seeker sub-profile if applicable
      if (isSeeker && seekerProfile) {
        await supabase.from('seeker_profiles').update({
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          skills,
          experience_level: experience || null,
        }).eq('id', (seekerProfile as any).id);
      }

      // Update employer sub-profile if applicable
      if (isEmployer && employerProfile) {
        await supabase.from('employer_profiles').update({
          company_name: companyName.trim(),
        }).eq('id', employerProfile.id);
      }

      await refreshProfile();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const initial = (fullName || '?').charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[editS.safe, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[editS.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose} style={editS.closeBtn}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={[editS.headerTitle, { color: colors.white, fontFamily: Fonts.heading }]}>
            EDIT PROFILE
          </Text>
          <TouchableOpacity onPress={handleSave} style={editS.saveBtn} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={[editS.saveText, { color: colors.white, fontFamily: Fonts.heading }]}>SAVE</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={editS.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={editS.avatarSection}>
            <View style={[editS.avatarRing, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={editS.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : (
                <Text style={[editS.avatarInitial, { color: colors.primary, fontFamily: Fonts.heading }]}>
                  {initial}
                </Text>
              )}
            </View>
            <TouchableOpacity style={[editS.changePhotoBtn, { borderColor: colors.border }]}>
              <Ionicons name="camera-outline" size={14} color={colors.mutedText} />
              <Text style={[editS.changePhotoText, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                Change Photo (coming soon)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section: Basic Info */}
          <View style={[editS.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[editS.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
              Basic Info
            </Text>
            <InputField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
            />
            <PhoneInput
              label="Contact Number"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Section: Employer Profile — only shown in employer mode */}
          {isEmployer && (
            <View style={[editS.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[editS.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
                Employer Profile
              </Text>

              <InputField
                label={employerProfile?.employer_type === 'individual' ? 'Display Name' : 'Company / Business Name'}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="e.g. Nakato Enterprises"
              />
            </View>
          )}

          {/* Section: Seeker Profile — only shown in seeker mode */}
          {isSeeker && (
            <View style={[editS.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[editS.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
                Seeker Profile
              </Text>

              <InputField
                label="Headline"
                value={headline}
                onChangeText={setHeadline}
                placeholder="e.g. Experienced Electrician in Kampala"
              />

              <InputField
                label="Bio"
                value={bio}
                onChangeText={setBio}
                placeholder="A few words about your experience..."
                multiline
                numberOfLines={4}
                style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }}
              />

              {/* Skills */}
              <Text style={[editS.fieldLabel, { color: colors.primary, fontFamily: Fonts.heading }]}>
                Skills
              </Text>
              <View style={editS.chipWrap}>
                {SKILLS_OPTIONS.map((s) => (
                  <Chip
                    key={s} label={s}
                    active={skills.includes(s)}
                    onPress={() => toggleSkill(s)}
                    colors={colors}
                  />
                ))}
              </View>

              {/* Experience */}
              <Text style={[editS.fieldLabel, { color: colors.primary, fontFamily: Fonts.heading, marginTop: Spacing.md }]}>
                Experience Level
              </Text>
              <View style={editS.expGrid}>
                {EXPERIENCE_LEVELS.map((lvl) => {
                  const active = experience === lvl.value;
                  return (
                    <TouchableOpacity
                      key={lvl.value}
                      style={[
                        editS.expCard,
                        { borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primaryLight : colors.background },
                      ]}
                      onPress={() => setExperience(lvl.value)}
                      activeOpacity={0.75}
                    >
                      {active && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                      )}
                      <Text style={[editS.expLabel, { color: active ? colors.primary : colors.text, fontFamily: Fonts.heading }]}>
                        {lvl.label}
                      </Text>
                      <Text style={[editS.expSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                        {lvl.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section: Location */}
          <View style={[editS.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[editS.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
              Location
            </Text>
            <Text style={[editS.fieldLabel, { color: colors.primary, fontFamily: Fonts.heading }]}>
              Your District
            </Text>
            <View style={editS.chipWrap}>
              {DISTRICTS.map((d) => (
                <Chip
                  key={d} label={d}
                  active={district === d}
                  onPress={() => setDistrict(district === d ? '' : d)}
                  colors={colors}
                />
              ))}
            </View>
          </View>

          <AppButton
            label={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            style={{ marginTop: Spacing.md }}
            disabled={saving}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const editS = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, letterSpacing: 2 },
  saveBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 13, letterSpacing: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.lg, gap: Spacing.sm },
  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
  },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarInitial: { fontSize: 48 },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  changePhotoText: { fontSize: 12 },
  section: {
    borderRadius: 14, borderWidth: 1.5,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 14, letterSpacing: 0.5, marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, marginBottom: Spacing.sm, letterSpacing: 0.3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  expGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  expCard: {
    flex: 1, minWidth: '44%', borderRadius: 10, borderWidth: 1.5,
    padding: Spacing.sm, alignItems: 'center',
  },
  expLabel: { fontSize: 13, textAlign: 'center' },
  expSub: { fontSize: 10, textAlign: 'center', marginTop: 2 },
});

// ─── Notifications Modal ──────────────────────────────────────────────────────
function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [jobAlerts, setJobAlerts]   = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  const [reminders, setReminders]   = useState(false);

  const toggles = [
    { icon: 'briefcase-outline' as const, label: 'Job Alerts',  sub: 'New jobs posted near your location',   value: jobAlerts,  set: setJobAlerts },
    { icon: 'megaphone-outline' as const, label: 'App Updates', sub: 'News and new features from HustleUG',  value: appUpdates, set: setAppUpdates },
    { icon: 'alarm-outline' as const,     label: 'Reminders',   sub: 'Reminders about jobs you applied for', value: reminders,  set: setReminders },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: Fonts.heading }]}>Notifications</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.mutedText} /></TouchableOpacity>
            </View>
            <Text style={[styles.sheetSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
              Choose what you want to hear about
            </Text>
            {toggles.map((item, i) => (
              <View key={item.label} style={[styles.toggleRow, { borderBottomColor: colors.border, borderBottomWidth: i < toggles.length - 1 ? 1.5 : 0 }]}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.toggleTexts}>
                  <Text style={[styles.toggleLabel, { color: colors.text, fontFamily: Fonts.heading }]}>{item.label}</Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>{item.sub}</Text>
                </View>
                <Switch value={item.value} onValueChange={item.set} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.white} />
              </View>
            ))}
            <AppButton label="Save Preferences" onPress={onClose} style={{ marginTop: Spacing.md }} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Theme Picker Modal ───────────────────────────────────────────────────────
function ThemePickerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'themes' | 'darkmodes'>('themes');

  const appThemes = [
    { mode: 'light' as ThemeMode, label: 'Green', sub: 'The classic HustleUG look', preview: '#F4F6F4', accent: '#00C853' },
  ];
  const darkModes: { mode: ThemeMode; label: string; sub: string; preview: string; accent: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { mode: 'dark',     label: 'Dark',      sub: 'Easy on the eyes at night',         preview: '#1E1E1E', accent: '#00C853', icon: 'moon-outline' },
    { mode: 'amoled',   label: 'AMOLED',    sub: 'Pure black, saves battery on OLED', preview: '#000000', accent: '#00C853', icon: 'contrast-outline' },
    { mode: 'deepblue', label: 'Deep Blue', sub: 'Premium navy dark',                 preview: '#0D1B2E', accent: '#00C853', icon: 'planet-outline' },
    { mode: 'tide',     label: 'TIDE',      sub: 'Cyan glow on deep teal',            preview: '#001419', accent: '#00D4FF', icon: 'water-outline' },
    { mode: 'acid',     label: 'ACID',      sub: 'Neon lime on near-black',           preview: '#0C1100', accent: '#CBFF00', icon: 'flash-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: Fonts.heading }]}>Appearance</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.mutedText} /></TouchableOpacity>
            </View>
            <View style={[styles.tabs, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {(['themes', 'darkmodes'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, { fontFamily: Fonts.heading, color: activeTab === tab ? '#FFF' : colors.mutedText }]}>
                    {tab === 'themes' ? 'Themes' : 'Dark Modes'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {activeTab === 'themes' && (
              <View style={styles.themeCards}>
                {appThemes.map((t) => {
                  const selected = themeMode === t.mode;
                  return (
                    <TouchableOpacity
                      key={t.mode}
                      style={[styles.themeCard, { borderColor: selected ? t.accent : colors.border, borderWidth: selected ? 2.5 : 1.5 }]}
                      onPress={() => { setThemeMode(t.mode); onClose(); }}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.themeCardSwatch, { backgroundColor: t.preview }]}>
                        <View style={[styles.themeCardAccentBar, { backgroundColor: t.accent }]} />
                      </View>
                      <View style={styles.themeCardText}>
                        <Text style={[styles.themeLabel, { color: colors.text, fontFamily: Fonts.heading }]}>{t.label}</Text>
                        <Text style={[styles.themeSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>{t.sub}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={22} color={t.accent} />}
                    </TouchableOpacity>
                  );
                })}
                <Text style={[styles.themesComingSoon, { color: colors.mutedText, fontFamily: Fonts.body }]}>More themes coming soon</Text>
              </View>
            )}
            {activeTab === 'darkmodes' && (
              <View>
                {darkModes.map((t, i) => {
                  const selected = themeMode === t.mode;
                  return (
                    <TouchableOpacity
                      key={t.mode}
                      style={[
                        styles.themeRow,
                        { borderBottomColor: colors.border, borderBottomWidth: i < darkModes.length - 1 ? 1 : 0 },
                        selected && { backgroundColor: colors.primaryLight },
                      ]}
                      onPress={() => { setThemeMode(t.mode); onClose(); }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.themeSwatch, { backgroundColor: t.preview, borderColor: selected ? t.accent : colors.border }]}>
                        <Ionicons name={t.icon} size={18} color={t.accent} />
                      </View>
                      <View style={styles.themeTexts}>
                        <Text style={[styles.themeLabel, { color: colors.text, fontFamily: Fonts.heading }]}>{t.label}</Text>
                        <Text style={[styles.themeSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>{t.sub}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={22} color={t.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Role Switcher Modal ──────────────────────────────────────────────────────
function RoleSwitcherModal({
  visible, onClose, activeRole, canSwitchRole, onSwitch, onAddHat,
}: {
  visible: boolean; onClose: () => void; activeRole: string | null;
  canSwitchRole: boolean; onSwitch: (role: 'seeker' | 'employer') => void;
  onAddHat: (role: 'seeker' | 'employer') => void;
}) {
  const { colors } = useTheme();
  const [switching, setSwitching] = useState(false);

  const hats: { role: 'seeker' | 'employer'; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { role: 'seeker',   label: 'Job Seeker', sub: 'Browse and apply for jobs',  icon: 'search-outline' },
    { role: 'employer', label: 'Employer',   sub: 'Post jobs and hire workers', icon: 'briefcase-outline' },
  ];

  const handleSwitch = async (role: 'seeker' | 'employer') => {
    if (role === activeRole) { onClose(); return; }
    setSwitching(true);
    await onSwitch(role);
    setSwitching(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: Fonts.heading }]}>Switch Hat</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.mutedText} /></TouchableOpacity>
            </View>
            <Text style={[styles.sheetSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
              One account, two modes. Switch anytime.
            </Text>
            {hats.map((hat) => {
              const isActive  = hat.role === activeRole;
              const isMissing = !canSwitchRole && hat.role !== activeRole;
              return (
                <TouchableOpacity
                  key={hat.role}
                  style={[
                    styles.hatRow,
                    { borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? colors.primaryLight : colors.background },
                  ]}
                  onPress={() => isMissing ? onAddHat(hat.role) : handleSwitch(hat.role)}
                  disabled={switching}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hatIcon, { backgroundColor: isActive ? colors.primary : colors.card }]}>
                    <Ionicons name={hat.icon} size={22} color={isActive ? colors.white : colors.mutedText} />
                  </View>
                  <View style={styles.hatTexts}>
                    <Text style={[styles.hatLabel, { color: colors.text, fontFamily: Fonts.heading }]}>{hat.label}</Text>
                    <Text style={[styles.hatSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                      {isMissing ? 'Tap to set up' : hat.sub}
                    </Text>
                  </View>
                  {isActive && !switching && (
                    <View style={[styles.activeChip, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.activeChipText, { fontFamily: Fonts.heading }]}>ACTIVE</Text>
                    </View>
                  )}
                  {!isActive && !isMissing && !switching && (
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.mutedText} />
                  )}
                  {isMissing && <Ionicons name="add-circle-outline" size={22} color={colors.primary} />}
                  {switching && !isActive && <ActivityIndicator size="small" color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { profile, employerProfile, seekerProfile, activeRole, canSwitchRole, switchRole, signOut, refreshProfile } = useUser();
  const { cancelJob, refreshJobs, fetchJobsByEmployer } = useJobs();

  const [editVisible, setEdit]         = useState(false);
  const [notifVisible, setNotif]       = useState(false);
  const [themeVisible, setTheme]       = useState(false);
  const [switcherVisible, setSwitcher] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [upgrading, setUpgrading] = useState(false);
  const [awaitingPaymentId, setAwaitingPaymentId] = useState<string | null>(null);

  const isEmployer = activeRole === 'employer';

  // Polls the payments row this employer just created rather than
  // waiting passively -- momo-webhook and momo-reconcile-and-expire
  // both update it server-side once MTN reports back, but the app has
  // no other way to know that happened short of the employer manually
  // pulling to refresh. Gives up after ~2 minutes; if MTN is just slow,
  // the reconciliation sweep (every 5 min) still resolves it correctly
  // in the background even after this stops watching.
  const pollPaymentStatus = useCallback(async (paymentId: string) => {
    const maxAttempts = 24; // 24 * 5s = 2 minutes
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const { data: payment } = await supabase
        .from('payments')
        .select('status, failure_reason')
        .eq('id', paymentId)
        .single();

      if (!payment || payment.status === 'pending') continue;

      setAwaitingPaymentId(null);

      if (payment.status === 'successful') {
        await refreshProfile();
        Alert.alert('Upgrade complete', "You're now on HustleUG Pro for the next 7 days.");
      } else {
        Alert.alert(
          'Payment not completed',
          payment.failure_reason ?? 'The payment was declined or timed out. You can try again.',
        );
      }
      return;
    }

    // Still pending after 2 minutes -- stop watching actively, but the
    // payment isn't lost; the reconciliation sweep will resolve it and
    // the employer will see the change next time they open Profile.
    setAwaitingPaymentId(null);
    Alert.alert(
      'Still processing',
      "This is taking longer than usual. If you approved the payment on your phone, it'll go through shortly — check back here in a few minutes.",
    );
  }, [refreshProfile]);

  const handleUpgrade = useCallback(async () => {
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-momo-payment');

      if (error || !data?.ok) {
        Alert.alert('Could not start payment', data?.error ?? error?.message ?? 'Please try again.');
        return;
      }

      setAwaitingPaymentId(data.paymentId);
      Alert.alert('Check your phone', 'Approve the UGX 2,000 payment prompt on your MTN Mobile Money line to activate Pro.');
      pollPaymentStatus(data.paymentId);
    } catch (err) {
      Alert.alert('Could not start payment', 'Please check your connection and try again.');
    } finally {
      setUpgrading(false);
    }
  }, [pollPaymentStatus]);

  // "My Posted Jobs" needs to show ALL of this employer's active listings,
  // not just whichever ones have been paged into the general public feed
  // (see JobsContext.fetchJobsByEmployer) — so it's fetched independently
  // rather than filtered from the shared paginated `jobs` array.
  const loadMyJobs = useCallback(async () => {
    if (!isEmployer || !employerProfile) {
      setMyJobs([]);
      return;
    }
    const { data } = await fetchJobsByEmployer(employerProfile.id);
    setMyJobs(data);
  }, [isEmployer, employerProfile, fetchJobsByEmployer]);

  // Accepting an applicant on ApplicantsScreen can auto-close a job
  // (positions_available hits 0) — refresh on focus (covers first mount
  // too) so that's reflected here without needing a manual
  // pull-to-refresh after navigating back.
  useFocusEffect(
    useCallback(() => {
      loadMyJobs();
    }, [loadMyJobs])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), refreshJobs(), loadMyJobs()]);
    setRefreshing(false);
  }, [refreshProfile, refreshJobs, loadMyJobs]);

  const fullName  = profile?.full_name ?? 'My Profile';
  const phone     = profile?.phone ?? '';
  const avatarUrl = profile?.avatar_url ?? null;
  const initial   = fullName.charAt(0).toUpperCase();
  const isSeeker   = activeRole === 'seeker';

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleCancelJob = (jobId: string, jobTitle: string) => {
    Alert.alert('Close Job', `Close "${jobTitle}"? It will no longer appear in the job feed.`, [
      { text: 'Keep Open', style: 'cancel' },
      {
        text: 'Close Job', style: 'destructive',
        onPress: async () => {
          setCancellingId(jobId);
          const { error } = await cancelJob(jobId);
          setCancellingId(null);
          if (error) {
            Alert.alert('Error', error);
            return;
          }
          // cancelJob only refreshes the general paginated feed — refetch
          // this screen's independent "My Posted Jobs" list too so the
          // closed job actually disappears from it.
          await loadMyJobs();
        },
      },
    ]);
  };

  const handleAddHat = (role: 'seeker' | 'employer') => {
    setSwitcher(false);
    Alert.alert(
      `Set up ${role === 'seeker' ? 'Job Seeker' : 'Employer'} profile`,
      `You'll be taken through a quick setup for your ${role === 'seeker' ? 'job seeker' : 'employer'} profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set Up Now', onPress: async () => { await switchRole(role); } },
      ]
    );
  };

  const settingsItems = [
    { icon: 'color-palette-outline' as const, label: 'Appearance',       danger: false, onPress: () => setTheme(true) },
    { icon: 'notifications-outline' as const, label: 'Notifications',    danger: false, onPress: () => setNotif(true) },
    { icon: 'lock-closed-outline' as const,   label: 'Privacy Settings', danger: false, onPress: () => Alert.alert('Coming Soon', 'Privacy settings coming soon.') },
    { icon: 'help-circle-outline' as const,   label: 'Help & Support',   danger: false, onPress: () => Alert.alert('Coming Soon', 'Help & Support coming soon.') },
    { icon: 'log-out-outline' as const,       label: 'Log Out',          danger: true,  onPress: handleSignOut },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['left', 'right']}>
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

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setEdit(true)} style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatar, { borderColor: colors.white }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryDark, borderColor: colors.white }]}>
                  <Text style={[styles.avatarInitialLarge, { color: colors.white, fontFamily: Fonts.heading }]}>{initial}</Text>
                </View>
              )}
              <View style={[styles.editAvatarBadge, { backgroundColor: colors.white }]}>
                <Ionicons name="camera" size={12} color={colors.primary} />
              </View>
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.userName, { color: colors.white, fontFamily: Fonts.heading }]}>{fullName}</Text>
              {phone ? <Text style={[styles.userPhone, { color: colors.white, fontFamily: Fonts.body, opacity: 0.85 }]}>{phone}</Text> : null}
              {isSeeker && (seekerProfile as any)?.headline ? (
                <Text style={[styles.userHeadline, { color: colors.white, fontFamily: Fonts.body, opacity: 0.9 }]} numberOfLines={1}>
                  {(seekerProfile as any).headline}
                </Text>
              ) : null}
              <View style={[styles.ratingBadge, { backgroundColor: colors.primaryDark }]}>
                <Ionicons name="star" size={12} color={colors.white} />
                <Text style={[styles.ratingText, { color: colors.white, fontFamily: Fonts.heading }]}>  — Trust Score</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={[styles.editProfileBtn, { borderColor: colors.white }]} onPress={() => setEdit(true)}>
            <Ionicons name="pencil-outline" size={14} color={colors.white} />
            <Text style={[styles.editProfileText, { color: colors.white, fontFamily: Fonts.heading }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hat Card ── */}
        <TouchableOpacity
          style={[styles.hatCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setSwitcher(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.hatCardIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={isEmployer ? 'briefcase-outline' : 'search-outline'} size={20} color={colors.primary} />
          </View>
          <View style={styles.hatCardTexts}>
            <Text style={[styles.hatCardLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>Currently using</Text>
            <Text style={[styles.hatCardRole, { color: colors.text, fontFamily: Fonts.heading }]}>
              {isEmployer ? 'Employer' : 'Job Seeker'} Mode
            </Text>
          </View>
          <View style={styles.hatCardRight}>
            {canSwitchRole
              ? <View style={[styles.switchBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.switchBadgeText, { color: colors.primary, fontFamily: Fonts.heading }]}>SWITCH</Text>
                </View>
              : <View style={[styles.addHatBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                  <Text style={[styles.addHatText, { color: colors.primary, fontFamily: Fonts.heading }]}>ADD HAT</Text>
                </View>
            }
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </View>
        </TouchableOpacity>

        {/* ── Stats ── */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: isEmployer ? 'Jobs Posted' : 'Applied', value: isEmployer ? myJobs.length : 0, icon: 'briefcase-outline' as const },
            { label: 'Completed', value: 0,   icon: 'checkmark-circle-outline' as const },
            { label: 'Rating',    value: '—', icon: 'star-outline' as const },
          ].map((stat, i, arr) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statBox}>
                <Ionicons name={stat.icon} size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text, fontFamily: Fonts.heading }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>{stat.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Subscription (employers only) ── */}
        {isEmployer && employerProfile && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {employerProfile.tier === 'paid' ? (
              <View style={styles.subscriptionRow}>
                <View style={[styles.hatCardIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="star" size={20} color={colors.primary} />
                </View>
                <View style={styles.hatCardTexts}>
                  <Text style={[styles.hatCardRole, { color: colors.text, fontFamily: Fonts.heading }]}>
                    HustleUG Pro
                  </Text>
                  <Text style={[styles.hatCardLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                    {employerProfile.tier_expires_at
                      ? `Renews or expires ${new Date(employerProfile.tier_expires_at).toLocaleDateString()}`
                      : 'Active'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.subscriptionRow}>
                <View style={styles.hatCardTexts}>
                  <Text style={[styles.hatCardRole, { color: colors.text, fontFamily: Fonts.heading }]}>
                    Upgrade to Pro
                  </Text>
                  <Text style={[styles.hatCardLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                    UGX 2,000/week · unlimited posts · 3 photos + video
                  </Text>
                </View>
                <AppButton
                  label={awaitingPaymentId ? 'Awaiting approval…' : 'Upgrade'}
                  onPress={handleUpgrade}
                  loading={upgrading}
                  disabled={upgrading || awaitingPaymentId !== null}
                  style={styles.upgradeButton}
                />
              </View>
            )}
          </View>
        )}

        {/* ── Seeker skills summary ── */}
        {isSeeker && (seekerProfile as any)?.skills?.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="construct-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>My Skills</Text>
            </View>
            <View style={styles.skillsWrap}>
              {(seekerProfile as any).skills.map((s: string) => (
                <View key={s} style={[styles.skillChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[styles.skillChipText, { color: colors.primary, fontFamily: Fonts.heading }]}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── My Posted Jobs (employers only) ── */}
        {isEmployer && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="list-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>My Posted Jobs</Text>
            </View>
            {myJobs.length === 0 ? (
              <View style={styles.emptyJobs}>
                <Ionicons name="briefcase-outline" size={28} color={colors.mutedText} />
                <Text style={[styles.emptyJobsText, { color: colors.mutedText, fontFamily: Fonts.body }]}>No active jobs posted yet</Text>
              </View>
            ) : (
              myJobs.map((job, i) => (
                <View
                  key={job.id}
                  style={[styles.postedJobRow, { borderBottomColor: colors.border, borderBottomWidth: i < myJobs.length - 1 ? 1 : 0 }]}
                >
                  <TouchableOpacity
                    style={styles.postedJobPressable}
                    onPress={() => navigation.navigate('Applicants', { jobId: job.id, jobTitle: job.title })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.postedJobIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.postedJobInfo}>
                      <Text style={[styles.postedJobTitle, { color: colors.text, fontFamily: Fonts.heading }]} numberOfLines={1}>{job.title}</Text>
                      <Text style={[styles.postedJobMeta, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                        UGX {job.pay.toLocaleString()} · {job.location}
                      </Text>
                      <View style={styles.applicantsHint}>
                        <Ionicons name="people-outline" size={11} color={colors.primary} />
                        <Text style={[styles.applicantsHintText, { color: colors.primary, fontFamily: Fonts.heading }]}>
                          {' '}{job.positions ?? 1} position{(job.positions ?? 1) === 1 ? '' : 's'} · View applicants
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeJobBtn, { borderColor: colors.danger ?? '#EF4444' }]}
                    onPress={() => handleCancelJob(job.id, job.title)}
                    disabled={cancellingId === job.id}
                    activeOpacity={0.75}
                  >
                    {cancellingId === job.id
                      ? <ActivityIndicator size="small" color={colors.danger ?? '#EF4444'} />
                      : <Text style={[styles.closeJobText, { color: colors.danger ?? '#EF4444', fontFamily: Fonts.heading }]}>CLOSE</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Settings ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="settings-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Fonts.heading }]}>Settings</Text>
          </View>
          {settingsItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingsRow, { borderBottomColor: colors.border, borderBottomWidth: i < settingsItems.length - 1 ? 1 : 0 }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIcon, { backgroundColor: item.danger ? '#FEE2E2' : colors.primaryLight }]}>
                <Ionicons name={item.icon} size={18} color={item.danger ? (colors.danger ?? '#EF4444') : colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: item.danger ? (colors.danger ?? '#EF4444') : colors.text, fontFamily: Fonts.heading }]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Dark mode FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.text }]} onPress={toggleTheme} activeOpacity={0.85}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.white} />
      </TouchableOpacity>

      <EditProfileModal visible={editVisible} onClose={() => setEdit(false)} />
      <NotificationsModal visible={notifVisible} onClose={() => setNotif(false)} />
      <ThemePickerModal visible={themeVisible} onClose={() => setTheme(false)} />
      <RoleSwitcherModal
        visible={switcherVisible}
        onClose={() => setSwitcher(false)}
        activeRole={activeRole}
        canSwitchRole={canSwitchRole}
        onSwitch={switchRole}
        onAddHat={handleAddHat}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.md },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, overflow: 'hidden' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitialLarge: { fontSize: 32 },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  headerText: { flex: 1, gap: 4 },
  userName: { fontSize: 22, letterSpacing: 0.5 },
  userPhone: { fontSize: 13 },
  userHeadline: { fontSize: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 2 },
  ratingText: { fontSize: 12 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1.5, borderRadius: 10 },
  editProfileText: { fontSize: 14 },
  hatCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: 12, borderWidth: 1.5, padding: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  hatCardIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hatCardTexts: { flex: 1, gap: 2 },
  hatCardLabel: { fontSize: 11 },
  hatCardRole: { fontSize: 15 },
  hatCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  switchBadgeText: { fontSize: 10, letterSpacing: 1 },
  addHatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  addHatText: { fontSize: 10, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: 12, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 4 },
  statDivider: { width: 1.5 },
  statValue: { fontSize: 20, letterSpacing: 0.3 },
  statLabel: { fontSize: 11, textAlign: 'center' },
  subscriptionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  upgradeButton: { paddingHorizontal: Spacing.md, paddingVertical: 10, minHeight: 40, borderRadius: 8 },
  section: { marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: 12, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 14, letterSpacing: 0.3 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md, gap: 6 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  skillChipText: { fontSize: 11 },
  emptyJobs: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  emptyJobsText: { fontSize: 13 },
  postedJobRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  postedJobPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  postedJobIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  postedJobInfo: { flex: 1, gap: 3 },
  postedJobTitle: { fontSize: 14 },
  postedJobMeta: { fontSize: 12 },
  applicantsHint: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  applicantsHintText: { fontSize: 11 },
  closeJobBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 56, alignItems: 'center' },
  closeJobText: { fontSize: 11, letterSpacing: 1 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  settingsIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { flex: 1, fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1.5, padding: Spacing.lg, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xs },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 22, letterSpacing: 0.5 },
  sheetSub: { fontSize: 13, marginTop: -6, marginBottom: Spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: Spacing.md },
  toggleIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleTexts: { flex: 1, gap: 3 },
  toggleLabel: { fontSize: 15 },
  toggleSub: { fontSize: 11 },
  tabs: { flexDirection: 'row', borderRadius: 10, borderWidth: 1.5, overflow: 'hidden', marginBottom: Spacing.sm },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, letterSpacing: 0.5 },
  themeCards: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },
  themeCard: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  themeCardSwatch: { height: 80, position: 'relative', overflow: 'hidden' },
  themeCardAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  themeCardText: { padding: Spacing.sm, gap: 3 },
  themeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: Spacing.md, borderRadius: 8, paddingHorizontal: 4 },
  themeSwatch: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  themeTexts: { flex: 1, gap: 3 },
  themeLabel: { fontSize: 15 },
  themeSub: { fontSize: 11 },
  themesComingSoon: { fontSize: 12, textAlign: 'center', marginTop: Spacing.md, fontStyle: 'italic' },
  hatRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 2, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm },
  hatIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hatTexts: { flex: 1, gap: 3 },
  hatLabel: { fontSize: 16 },
  hatSub: { fontSize: 12 },
  activeChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeChipText: { color: '#FFF', fontSize: 10, letterSpacing: 1 },
});
