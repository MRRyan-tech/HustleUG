// screens/OnboardingScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { supabase } from '../src/lib/supabase';
import { Fonts } from '../constants/fonts';
import Spacing from '../constants/spacing';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';

// ─── Constants ────────────────────────────────────────────────────────────────
const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Mbarara',
  'Gulu', 'Lira', 'Masaka', 'Entebbe', 'Soroti', 'Arua', 'Other',
];

const EXPERIENCE_LEVELS = [
  { value: 'entry',     label: 'Entry Level',   sub: '0 – 2 years' },
  { value: 'mid',       label: 'Mid Level',     sub: '3 – 5 years' },
  { value: 'senior',    label: 'Senior',        sub: '6 – 10 years' },
  { value: 'executive', label: 'Executive',     sub: '10+ years' },
];

const INDUSTRIES = [
  'Technology', 'Construction', 'Healthcare', 'Hospitality',
  'Education', 'Finance', 'Agriculture', 'Transport',
  'Manufacturing', 'Media', 'Security', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const SKILLS_OPTIONS = [
  'Cleaning', 'Driving', 'Cooking', 'Security', 'Construction',
  'Plumbing', 'Electrical', 'Carpentry', 'Welding', 'Tailoring',
  'Farming', 'Teaching', 'Nursing', 'Accounting', 'Sales',
  'IT Support', 'Design', 'Marketing', 'Delivery', 'Mechanics',
];

// ─── Shared Components ────────────────────────────────────────────────────────
function StepDots({ total, current, colors }: { total: number; current: number; colors: any }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            { backgroundColor: i <= current ? colors.primary : colors.border },
            i === current && dotStyles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
});

function ChipSelector({
  options, selected, onToggle, colors, multi = true,
}: {
  options: string[]; selected: string[]; onToggle: (val: string) => void;
  colors: any; multi?: boolean;
}) {
  return (
    <View style={chipStyles.wrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[
              chipStyles.chip,
              { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.card },
            ]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.7}
          >
            <Text style={[chipStyles.chipText, { color: active ? colors.primary : colors.mutedText, fontFamily: Fonts.heading }]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13 },
});

function OptionRow({ label, sub, selected, onPress, colors }: {
  label: string; sub: string; selected: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        shared.optionRow,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primaryLight : colors.card },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[shared.optionLabel, { color: colors.text, fontFamily: Fonts.heading }]}>{label}</Text>
        <Text style={[shared.optionSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>{sub}</Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );
}

// ─── Seeker Onboarding ────────────────────────────────────────────────────────
function SeekerOnboarding({ profile, onComplete }: { profile: any; onComplete: () => void }) {
  const { colors } = useTheme();
  const [step, setStep]             = useState(0);
  const [headline, setHeadline]     = useState('');
  const [bio, setBio]               = useState('');
  const [skills, setSkills]         = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [district, setDistrict]     = useState('');
  const [loading, setLoading]       = useState(false);

  const toggleSkill = (skill: string) =>
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);

  const handleComplete = async () => {
    if (!experience) { Alert.alert('Required', 'Please select your experience level.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('seeker_profiles').insert({
        profile_id: profile.id,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        skills,
        experience_level: experience,
        open_to_work: true,
      });
      if (error) throw error;
      if (district) await supabase.from('profiles').update({ district }).eq('id', profile.id);
      onComplete();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    <View key="about">
      <Text style={[shared.stepTitle, { color: colors.text }]}>Tell us about yourself</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText }]}>Help employers know what you do</Text>
      <InputField label="Headline" value={headline} onChangeText={setHeadline} placeholder="e.g. Experienced Electrician in Kampala" containerStyle={{ marginTop: 20 }} />
      <InputField label="Short Bio (optional)" value={bio} onChangeText={setBio} placeholder="A few words about your experience..." multiline numberOfLines={3} />
      <AppButton label="Next →" onPress={() => setStep(1)} />
    </View>,

    <View key="skills">
      <Text style={[shared.stepTitle, { color: colors.text }]}>What are your skills?</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText }]}>Pick all that apply</Text>
      <View style={{ marginTop: 20, marginBottom: 24 }}>
        <ChipSelector options={SKILLS_OPTIONS} selected={skills} onToggle={toggleSkill} colors={colors} />
      </View>
      <AppButton label="Next →" onPress={() => setStep(2)} disabled={skills.length === 0} />
      <TouchableOpacity onPress={() => setStep(2)} style={shared.skipBtn}>
        <Text style={[shared.skipText, { color: colors.mutedText }]}>Skip for now</Text>
      </TouchableOpacity>
    </View>,

    <View key="experience">
      <Text style={[shared.stepTitle, { color: colors.text }]}>Experience & Location</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText }]}>Help us match you with the right jobs</Text>
      <Text style={[shared.fieldLabel, { color: colors.primary }]}>Experience Level</Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {EXPERIENCE_LEVELS.map((lvl) => (
          <OptionRow key={lvl.value} label={lvl.label} sub={lvl.sub} selected={experience === lvl.value} onPress={() => setExperience(lvl.value)} colors={colors} />
        ))}
      </View>
      <Text style={[shared.fieldLabel, { color: colors.primary }]}>Your District</Text>
      <ChipSelector options={DISTRICTS} selected={district ? [district] : []} onToggle={(d) => setDistrict(d === district ? '' : d)} colors={colors} multi={false} />
      <View style={{ marginTop: 24 }}>
        <AppButton label={loading ? 'Saving...' : 'Complete Setup'} onPress={handleComplete} disabled={loading} />
      </View>
    </View>,
  ];

  return (
    <View style={{ flex: 1 }}>
      <StepDots total={3} current={step} colors={colors} />
      {steps[step]}
    </View>
  );
}

// ─── Business Employer Onboarding ─────────────────────────────────────────────
function BusinessOnboarding({ profile, onComplete }: { profile: any; onComplete: () => void }) {
  const { colors } = useTheme();
  const [step, setStep]               = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry]       = useState('');
  const [companySize, setCompanySize] = useState('');
  const [website, setWebsite]         = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict]       = useState('');
  const [loading, setLoading]         = useState(false);

  const handleComplete = async () => {
    if (!companyName.trim()) { Alert.alert('Required', 'Please enter your company name.'); return; }
    if (!industry) { Alert.alert('Required', 'Please select your industry.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('employer_profiles').insert({
        profile_id: profile.id,
        employer_type: 'business',
        company_name: companyName.trim(),
        industry,
        company_size: companySize || null,
        website: website.trim() || null,
        description: description.trim() || null,
      });
      if (error) throw error;
      if (district) await supabase.from('profiles').update({ district }).eq('id', profile.id);
      onComplete();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    <View key="company">
      <Text style={[shared.stepTitle, { color: colors.text }]}>About your company</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText }]}>Let job seekers know who you are</Text>
      <InputField label="Company / Organisation Name" value={companyName} onChangeText={setCompanyName} placeholder="e.g. Nakato Enterprises" containerStyle={{ marginTop: 20 }} />
      <InputField label="Website (optional)" value={website} onChangeText={setWebsite} placeholder="https://yourcompany.com" keyboardType="url" autoCapitalize="none" />
      <InputField label="Description (optional)" value={description} onChangeText={setDescription} placeholder="What does your company do?" multiline numberOfLines={3} />
      <AppButton label="Next →" onPress={() => { if (!companyName.trim()) { Alert.alert('Required', 'Please enter your company name.'); return; } setStep(1); }} />
    </View>,

    <View key="industry">
      <Text style={[shared.stepTitle, { color: colors.text }]}>Industry & Size</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText }]}>Helps seekers find relevant jobs</Text>
      <Text style={[shared.fieldLabel, { color: colors.primary }]}>Industry</Text>
      <View style={{ marginBottom: 20 }}>
        <ChipSelector options={INDUSTRIES} selected={industry ? [industry] : []} onToggle={(i) => setIndustry(i === industry ? '' : i)} colors={colors} multi={false} />
      </View>
      <Text style={[shared.fieldLabel, { color: colors.primary }]}>Company Size</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {COMPANY_SIZES.map((size) => (
          <TouchableOpacity
            key={size}
            style={[shared.sizeChip, { borderColor: companySize === size ? colors.primary : colors.border, backgroundColor: companySize === size ? colors.primaryLight : colors.card }]}
            onPress={() => setCompanySize(size === companySize ? '' : size)}
          >
            <Text style={[shared.sizeChipText, { color: companySize === size ? colors.primary : colors.mutedText, fontFamily: Fonts.heading }]}>{size}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <AppButton label="Next →" onPress={() => { if (!industry) { Alert.alert('Required', 'Please select your industry.'); return; } setStep(2); }} />
    </View>,

    <View key="location">
      <Text style={[shared.stepTitle, { color: colors.text }]}>Where are you based?</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText }]}>Helps seekers near you find your jobs</Text>
      <View style={{ marginTop: 20, marginBottom: 24 }}>
        <ChipSelector options={DISTRICTS} selected={district ? [district] : []} onToggle={(d) => setDistrict(d === district ? '' : d)} colors={colors} multi={false} />
      </View>
      <AppButton label={loading ? 'Saving...' : 'Complete Setup'} onPress={handleComplete} disabled={loading} />
      <TouchableOpacity onPress={handleComplete} style={shared.skipBtn}>
        <Text style={[shared.skipText, { color: colors.mutedText }]}>Skip location</Text>
      </TouchableOpacity>
    </View>,
  ];

  return (
    <View style={{ flex: 1 }}>
      <StepDots total={3} current={step} colors={colors} />
      {steps[step]}
    </View>
  );
}

// ─── Individual Employer Onboarding ──────────────────────────────────────────
function IndividualOnboarding({ profile, onComplete }: { profile: any; onComplete: () => void }) {
  const { colors } = useTheme();
  const [district, setDistrict] = useState('');
  const [loading, setLoading]   = useState(false);

  // Name is pre-filled from their signup profile
  const displayName = profile?.full_name ?? 'there';

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('employer_profiles').insert({
        profile_id: profile.id,
        employer_type: 'individual',
        company_name: profile.full_name ?? 'Individual',
        industry: 'Other',
      });
      if (error) throw error;
      if (district) await supabase.from('profiles').update({ district }).eq('id', profile.id);
      onComplete();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Single step — no dots needed */}
      <Text style={[shared.stepTitle, { color: colors.text }]}>Almost there, {displayName.split(' ')[0]}!</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText }]}>
        Your name will appear on your job posts so people know who's hiring.
      </Text>

      {/* Name preview card */}
      <View style={[indStyles.nameCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
        <View style={[indStyles.nameAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[indStyles.nameInitial, { color: '#fff', fontFamily: Fonts.heading }]}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[indStyles.nameLabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>Your posts will appear as</Text>
          <Text style={[indStyles.nameValue, { color: colors.text, fontFamily: Fonts.heading }]}>{displayName}</Text>
          <View style={[indStyles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[indStyles.badgeText, { color: '#fff', fontFamily: Fonts.heading }]}>🏠  Personal Hire</Text>
          </View>
        </View>
      </View>

      {/* District picker */}
      <Text style={[shared.fieldLabel, { color: colors.primary, marginTop: 24 }]}>Your District (optional)</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText, marginBottom: 12 }]}>
        Helps workers near you find your posts faster
      </Text>
      <ChipSelector
        options={DISTRICTS}
        selected={district ? [district] : []}
        onToggle={(d) => setDistrict(d === district ? '' : d)}
        colors={colors}
        multi={false}
      />

      <View style={{ marginTop: 28 }}>
        <AppButton label={loading ? 'Saving...' : "Let's Go! →"} onPress={handleComplete} disabled={loading} />
        <TouchableOpacity onPress={handleComplete} style={shared.skipBtn}>
          <Text style={[shared.skipText, { color: colors.mutedText }]}>Skip district</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const indStyles = StyleSheet.create({
  nameCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 12, borderWidth: 1.5, padding: 16, marginTop: 24,
  },
  nameAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  nameInitial: { fontSize: 22 },
  nameLabel: { fontSize: 11, marginBottom: 2 },
  nameValue: { fontSize: 17 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  badgeText: { fontSize: 11 },
});

// ─── Employer Type Picker ─────────────────────────────────────────────────────
type EmployerType = 'business' | 'individual' | null;

function EmployerTypePicker({ onSelect, colors }: { onSelect: (type: EmployerType) => void; colors: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[shared.stepTitle, { color: colors.text }]}>How will you be hiring?</Text>
      <Text style={[shared.stepSub, { color: colors.mutedText, marginBottom: 24 }]}>
        This helps us set up the right profile for you
      </Text>

      <TouchableOpacity
        style={[typeStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => onSelect('business')}
        activeOpacity={0.8}
      >
        <View style={[typeStyles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="business-outline" size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typeStyles.cardTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
            Business / Organisation
          </Text>
          <Text style={[typeStyles.cardSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            I represent a company, shop, NGO or organisation and hire regularly
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[typeStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => onSelect('individual')}
        activeOpacity={0.8}
      >
        <View style={[typeStyles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="home-outline" size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typeStyles.cardTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
            Individual / Household
          </Text>
          <Text style={[typeStyles.cardSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            I just need help with a task — cleaning, repairs, delivery, and so on
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
      </TouchableOpacity>
    </View>
  );
}

const typeStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1.5, padding: 18, marginBottom: 14,
  },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardSub: { fontSize: 12, lineHeight: 17 },
});

// ─── Main Onboarding Screen ───────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { profile, refreshProfile } = useUser();
  const [employerType, setEmployerType] = useState<EmployerType>(null);

  const handleComplete = async () => {
    await refreshProfile();
  };

  if (!profile) return null;

  const isEmployer = profile.role === 'employer';

  return (
    <SafeAreaView style={[os.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={os.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={os.header}>
            <View style={[os.iconBox, { backgroundColor: colors.primary }]}>
              <Text style={[os.iconLetter, { fontFamily: Fonts.heading }]}>H</Text>
            </View>
            <Text style={[os.title, { color: colors.text, fontFamily: Fonts.heading }]}>
              Welcome to <Text style={{ color: colors.primary }}>HustleUG</Text>
            </Text>
            <Text style={[os.subtitle, { color: colors.mutedText, fontFamily: Fonts.body }]}>
              {!isEmployer
                ? "Let's set up your profile so employers can find you"
                : employerType === null
                ? "Let's get you set up to post jobs"
                : employerType === 'business'
                ? "Tell us about your business"
                : "Just a couple of quick details"}
            </Text>
          </View>

          {/* Content card */}
          <View style={[os.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {!isEmployer ? (
              <SeekerOnboarding profile={profile} onComplete={handleComplete} />
            ) : employerType === null ? (
              <EmployerTypePicker onSelect={setEmployerType} colors={colors} />
            ) : employerType === 'business' ? (
              <BusinessOnboarding profile={profile} onComplete={handleComplete} />
            ) : (
              <IndividualOnboarding profile={profile} onComplete={handleComplete} />
            )}

            {/* Back button when employer has chosen a type */}
            {isEmployer && employerType !== null && (
              <TouchableOpacity
                style={os.backBtn}
                onPress={() => setEmployerType(null)}
              >
                <Ionicons name="arrow-back" size={16} color={colors.mutedText} />
                <Text style={[os.backText, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                  Back
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const shared = StyleSheet.create({
  stepTitle: { fontSize: 22, fontFamily: Fonts.heading, marginBottom: 4 },
  stepSub: { fontSize: 13, fontFamily: Fonts.body, marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.heading, marginBottom: 10, letterSpacing: 0.3 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 8 },
  optionLabel: { fontSize: 15 },
  optionSub: { fontSize: 12, fontFamily: Fonts.body, marginTop: 2 },
  skipBtn: { alignItems: 'center', marginTop: 12 },
  skipText: { fontSize: 13, fontFamily: Fonts.body },
  sizeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  sizeChipText: { fontSize: 13 },
});

const os = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 32, gap: 12 },
  iconBox: { width: 70, height: 70, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconLetter: { fontSize: 40, color: '#fff', lineHeight: 46 },
  title: { fontSize: 26, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: { borderRadius: 16, borderWidth: 2, padding: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, alignSelf: 'center' },
  backText: { fontSize: 13 },
});
