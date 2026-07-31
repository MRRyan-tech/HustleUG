// components/MediaPicker.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';
import Spacing from '../constants/spacing';
import { CaptureMode } from './CameraCaptureModal';

export interface MediaItem {
  uri: string;
  type: 'photo' | 'video';
}

interface MediaPickerProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (items: MediaItem[]) => void;
  photoCount: number;
  videoCount: number;
  // "Take a Photo" and "Record a Video" both hand off to the parent's
  // CameraCaptureModal rather than opening a camera nested inside this
  // sheet's own <Modal> — nested <Modal> presentation is what caused the
  // blank/black camera preview on iOS.
  onOpenCamera: (mode: CaptureMode) => void;
}

export default function MediaPickerModal({
  visible, onClose, onAdd, photoCount, videoCount, onOpenCamera,
}: MediaPickerProps) {
  const { colors } = useTheme();

  const maxPhotos = 3;
  // One video per job — matches both the roadmap's own paid-tier plan
  // ("3 photos + 1×30s video per post") and the Bunny Stream pipeline,
  // which stores a single video_provider_id per job row.
  const maxVideos = 1;
  const photosLeft = maxPhotos - photoCount;
  const videosLeft = maxVideos - videoCount;

  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    // Photos only from the gallery. Videos picked from the gallery on SDK 54+
    // are returned untouched (Passthrough mode) regardless of any quality
    // setting here, so there's no way to bound their size — video has to be
    // recorded fresh through the camera, where we can actually cap duration.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: photosLeft,
    });

    if (!result.canceled) {
      const items: MediaItem[] = [];
      let pCount = 0;

      for (const asset of result.assets) {
        if (pCount < photosLeft) {
          items.push({ uri: asset.uri, type: 'photo' });
          pCount++;
        }
      }

      if (items.length < result.assets.length) {
        Alert.alert('Some photos skipped', `Max ${maxPhotos} photos allowed.`);
      }

      onAdd(items);
      onClose();
    }
  };

  const options = [
    {
      icon: 'images-outline' as const,
      label: 'Choose Photos from Gallery',
      sublabel: `${photosLeft} photo${photosLeft !== 1 ? 's' : ''} remaining`,
      disabled: photosLeft === 0,
      onPress: openGallery,
    },
    {
      icon: 'camera-outline' as const,
      label: 'Take a Photo',
      sublabel: `${photosLeft} photo slot${photosLeft !== 1 ? 's' : ''} remaining`,
      disabled: photosLeft === 0,
      onPress: () => {
        onClose();
        onOpenCamera('photo');
      },
    },
    {
      icon: 'videocam-outline' as const,
      label: 'Record a Video',
      sublabel: `${videosLeft} slot${videosLeft !== 1 ? 's' : ''} remaining · max 30 seconds`,
      disabled: videosLeft === 0,
      onPress: () => {
        onClose();
        onOpenCamera('video');
      },
    },
  ];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.heading }]}>
            Add Media
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedText, fontFamily: Fonts.body }]}>
            Up to 3 photos and 1 video (recorded in-app, max 30s)
          </Text>

          {options.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={[
                styles.option,
                { borderColor: colors.border },
                opt.disabled && styles.optionDisabled,
              ]}
              onPress={opt.disabled ? undefined : opt.onPress}
              activeOpacity={opt.disabled ? 1 : 0.8}
            >
              <View style={[
                styles.optionIcon,
                { backgroundColor: opt.disabled ? colors.border : colors.primaryLight },
              ]}>
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={opt.disabled ? colors.mutedText : colors.primary}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionLabel,
                  { color: opt.disabled ? colors.mutedText : colors.text, fontFamily: Fonts.heading },
                ]}>
                  {opt.label}
                </Text>
                <Text style={[styles.optionSublabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                  {opt.sublabel}
                </Text>
              </View>
              {!opt.disabled && (
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.danger, fontFamily: Fonts.heading }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1.5,
    padding: Spacing.lg,
    paddingBottom: 36,
    gap: Spacing.md,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.xs,
  },
  title: { fontSize: 20, letterSpacing: 0.3 },
  subtitle: { fontSize: 12, marginTop: -8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  optionDisabled: { opacity: 0.45 },
  optionIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 3 },
  optionLabel: { fontSize: 15 },
  optionSublabel: { fontSize: 11 },
  cancelBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  cancelText: { fontSize: 15 },
});
