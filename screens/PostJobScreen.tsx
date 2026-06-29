// screens/PostJobScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Image, Alert, Animated, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ScreenContainer from '../components/ScreenContainer';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';
import CategoryChip from '../components/CategoryChip';
import PostJobLoader from '../components/PostJobLoader';
import MediaPickerModal, { MediaItem } from '../components/MediaPicker';
import PhoneInput from '../components/PhoneInput';
import { categories } from '../data/mockJobs';
import { Category } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useJobs } from '../context/JobsContext';
import { useUser } from '../context/UserContext';
import Spacing from '../constants/spacing';
import { Fonts } from '../constants/fonts';

interface FormData {
  title: string;
  category: Category;
  pay: string;
  description: string;
  location: string;
  contact: string;
}

interface FormErrors {
  title?: string;
  pay?: string;
  location?: string;
  contact?: string;
}

const initialForm: FormData = {
  title: '', category: 'Cleaning', pay: '',
  description: '', location: '', contact: '',
};

export default function PostJobScreen() {
  const { colors } = useTheme();
  const { addJob, refreshJobs } = useJobs();
  const { profile, employerProfile, refreshProfile } = useUser();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showLoader, setShowLoader] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const photoCount = mediaItems.filter((m) => m.type === 'photo').length;
  const videoCount = mediaItems.filter((m) => m.type === 'video').length;
  const canAddMore = photoCount < 3 || videoCount < 2;

  useEffect(() => {
    showTooltipFor3Seconds();
    if (profile?.phone) setForm((prev) => ({ ...prev, contact: profile.phone! }));
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshJobs(), refreshProfile()]);
    setRefreshing(false);
  }, [refreshJobs, refreshProfile]);

  const showTooltipFor3Seconds = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowTooltip(true);
    Animated.timing(tooltipOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    tooltipTimer.current = setTimeout(() => {
      Animated.timing(tooltipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => setShowTooltip(false)
      );
    }, 3000);
  };

  const setField = (field: keyof FormData, value: string | Category) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.title.trim()) newErrors.title = 'Job title is required';
    if (!form.pay.trim()) newErrors.pay = 'Pay amount is required';
    else if (isNaN(Number(form.pay))) newErrors.pay = 'Enter a valid number';
    if (!form.location.trim()) newErrors.location = 'Location is required';
    if (!form.contact.trim()) newErrors.contact = 'Contact number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please allow location access.');
        setDetectingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address) {
        const parts = [
          address.street,
          address.district,
          address.city ?? address.subregion,
        ].filter(Boolean);
        setField('location', parts.join(', '));
      }
    } catch (e) {
      Alert.alert('Error', 'Could not detect location. Please enter manually.');
    }
    setDetectingLocation(false);
  };

  const removeMedia = (uri: string) => {
    setMediaItems((prev) => prev.filter((m) => m.uri !== uri));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setShowLoader(true);

    const { error } = await addJob({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      pay: Number(form.pay),
      location: form.location.trim(),
      contact: form.contact.trim(),
    });

    if (error) {
      setShowLoader(false);
      Alert.alert('Could not post job', error);
      return;
    }

    setForm(initialForm);
    setMediaItems([]);
    setErrors({});
    setTimeout(() => setShowLoader(false), 1200);
  };

  if (profile?.role === 'seeker' || !employerProfile) {
    return (
      <ScreenContainer>
        <View style={styles.seekerNotice}>
          <View style={[styles.seekerIconBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="business-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.seekerTitle, { color: colors.text, fontFamily: Fonts.heading }]}>
            Employer Accounts Only
          </Text>
          <Text style={[styles.seekerSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            Posting jobs is available for employer accounts. If you're hiring, sign up with an employer account to post your first job.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PostJobLoader visible={showLoader} />
      <MediaPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onAdd={(items) => setMediaItems((prev) => [...prev, ...items])}
        photoCount={photoCount}
        videoCount={videoCount}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
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
            Post a Job
          </Text>
          <Text style={[styles.subtitle, { color: colors.white, fontFamily: Fonts.body }]}>
            Takes less than 2 minutes
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.background }]}>

          <InputField
            label="Job Title *"
            placeholder="e.g. House cleaner needed for 1 day"
            value={form.title}
            onChangeText={(v) => setField('title', v)}
            error={errors.title}
          />

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: Fonts.heading }]}>
              Category *
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {categories.filter((c) => c !== 'All').map((cat) => (
                <CategoryChip
                  key={cat}
                  title={cat}
                  selected={form.category === cat}
                  onPress={() => setField('category', cat as Category)}
                />
              ))}
            </ScrollView>
          </View>

          <InputField
            label="Pay (UGX) *"
            placeholder="e.g. 25000"
            value={form.pay}
            onChangeText={(v) => setField('pay', v)}
            keyboardType="numeric"
            error={errors.pay}
          />

          <InputField
            label="Job Description"
            placeholder="What needs to be done, start time, requirements..."
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          {/* Location */}
          <View style={styles.locationBlock}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: Fonts.heading }]}>
              Location *
            </Text>

            <View
              style={[
                styles.locationBar,
                {
                  backgroundColor: colors.card,
                  borderColor: errors.location ? colors.danger : colors.border,
                },
              ]}
            >
              <Ionicons name="location-outline" size={18} color={colors.mutedText} style={{ flexShrink: 0 }} />
              <TextInput
                value={form.location}
                onChangeText={(v) => setField('location', v)}
                style={[styles.locationInput, { color: colors.text, fontFamily: Fonts.body }]}
                placeholder="e.g. Ntinda, Kampala"
                placeholderTextColor={colors.mutedText}
              />

              <TouchableOpacity
                style={[styles.gpsBtn, { backgroundColor: colors.primary }, detectingLocation && { opacity: 0.6 }]}
                onPress={detectLocation}
                disabled={detectingLocation}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={detectingLocation ? 'hourglass-outline' : 'locate'}
                  size={18}
                  color={colors.white}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.infoBtn, { backgroundColor: colors.primaryLight }]}
                onPress={showTooltipFor3Seconds}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {errors.location ? (
              <Text style={[styles.locationError, { color: colors.danger, fontFamily: Fonts.body }]}>
                ⚠ {errors.location}
              </Text>
            ) : null}

            {showTooltip && (
              <Animated.View
                style={[styles.tooltip, { backgroundColor: colors.black, opacity: tooltipOpacity }]}
              >
                <Text style={[styles.tooltipText, { color: colors.white, fontFamily: Fonts.body }]}>
                  Tap the green button to detect your exact location automatically
                </Text>
              </Animated.View>
            )}
          </View>

          <PhoneInput
            label="Your Contact Number *"
            value={form.contact}
            onChangeText={(v) => setField('contact', v)}
            error={errors.contact}
          />

          {/* Media section */}
          <View style={styles.mediaSection}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: Fonts.heading }]}>
              Photos & Videos (Optional)
            </Text>
            <Text style={[styles.mediaCount, { color: colors.mutedText, fontFamily: Fonts.body }]}>
              {photoCount}/3 photos · {videoCount}/2 videos
            </Text>
            <Text style={[styles.mediaComingSoon, { color: colors.mutedText, fontFamily: Fonts.body }]}>
              Photo & video uploads aren't saved with your post yet — coming in a future update.
            </Text>

            {mediaItems.length > 0 && (
              <View style={styles.mediaGrid}>
                {mediaItems.map((item, i) => (
                  <View key={i} style={styles.mediaTile}>
                    {item.type === 'photo' ? (
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.mediaTileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.videoTile, { backgroundColor: colors.black }]}>
                        <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                        <Text style={[styles.videoTileLabel, { fontFamily: Fonts.heading }]}>
                          Video
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeTile}
                      onPress={() => removeMedia(item.uri)}
                    >
                      <Ionicons name="close-circle" size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {canAddMore && (
              <TouchableOpacity
                style={[styles.addMediaBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
                <Text style={[styles.addMediaLabel, { color: colors.text, fontFamily: Fonts.heading }]}>
                  {mediaItems.length === 0 ? 'Add Photos or Videos' : 'Add More Media'}
                </Text>
                <Text style={[styles.addMediaHint, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                  Camera · Gallery · Multi-select
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <AppButton
            label="Post Job Now"
            onPress={handleSubmit}
            style={styles.submitBtn}
          />

          <Text style={[styles.disclaimer, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            By posting, you agree to be contacted by job seekers via the number provided.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  seekerNotice: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  seekerIconBox: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  seekerTitle: { fontSize: 18, textAlign: 'center' },
  seekerSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  scroll: { paddingBottom: 60 },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  title: { fontSize: 30, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, opacity: 0.85, marginTop: 4 },
  form: { padding: Spacing.md },
  fieldBlock: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, marginBottom: Spacing.sm, letterSpacing: 0.3 },
  chipRow: { paddingRight: Spacing.md },
  locationBlock: { marginBottom: Spacing.md },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 6,
    minHeight: 52,
  },
  locationInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  locationError: { fontSize: 12, marginTop: Spacing.xs },
  gpsBtn: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  infoBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tooltip: {
    borderRadius: 8,
    padding: Spacing.sm,
    marginTop: 6,
  },
  tooltipText: { fontSize: 12, lineHeight: 18 },
  mediaSection: { marginBottom: Spacing.md },
  mediaCount: { fontSize: 11, marginTop: -4, marginBottom: 2 },
  mediaComingSoon: { fontSize: 11, fontStyle: 'italic', marginBottom: Spacing.sm },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  mediaTile: {
    width: 100, height: 100,
    borderRadius: 10, overflow: 'hidden',
    position: 'relative',
  },
  mediaTileImage: { width: '100%', height: '100%' },
  videoTile: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  videoTileLabel: { color: '#FFFFFF', fontSize: 11 },
  removeTile: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 11,
  },
  addMediaBtn: {
    borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', paddingVertical: Spacing.lg,
    gap: 6,
  },
  addMediaLabel: { fontSize: 14 },
  addMediaHint: { fontSize: 11 },
  submitBtn: { marginBottom: Spacing.md, marginTop: Spacing.md },
  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 18 },
});
