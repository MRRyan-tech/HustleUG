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
}

export default function MediaPickerModal({
  visible, onClose, onAdd, photoCount, videoCount,
}: MediaPickerProps) {
  const { colors } = useTheme();

  const maxPhotos = 3;
  const maxVideos = 2;
  const photosLeft = maxPhotos - photoCount;
  const videosLeft = maxVideos - videoCount;

  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'] as ImagePicker.MediaType[],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: photosLeft + videosLeft,
    });

    if (!result.canceled) {
      const items: MediaItem[] = [];
      let pCount = 0;
      let vCount = 0;

      for (const asset of result.assets) {
        const isVideo = asset.type === 'video' ||
          asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov');

        if (isVideo && vCount < videosLeft) {
          items.push({ uri: asset.uri, type: 'video' });
          vCount++;
        } else if (!isVideo && pCount < photosLeft) {
          items.push({ uri: asset.uri, type: 'photo' });
          pCount++;
        }
      }

      if (items.length < result.assets.length) {
        Alert.alert(
          'Some media skipped',
          `Max ${maxPhotos} photos and ${maxVideos} videos allowed.`
        );
      }

      onAdd(items);
      onClose();
    }
  };

  const openCamera = async (mode: 'photo' | 'video') => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: mode === 'photo'
        ? 'images' as ImagePicker.MediaType
        : 'videos' as ImagePicker.MediaType,
      quality: 0.7,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      onAdd([{ uri: result.assets[0].uri, type: mode }]);
      onClose();
    }
  };

  const options = [
    {
      icon: 'images-outline' as const,
      label: 'Choose from Gallery',
      sublabel: `${photosLeft} photo${photosLeft !== 1 ? 's' : ''} + ${videosLeft} video${videosLeft !== 1 ? 's' : ''} remaining`,
      disabled: photosLeft === 0 && videosLeft === 0,
      onPress: openGallery,
    },
    {
      icon: 'camera-outline' as const,
      label: 'Take a Photo',
      sublabel: `${photosLeft} photo slot${photosLeft !== 1 ? 's' : ''} remaining`,
      disabled: photosLeft === 0,
      onPress: () => openCamera('photo'),
    },
    {
      icon: 'videocam-outline' as const,
      label: 'Record a Video',
      sublabel: `${videosLeft} video slot${videosLeft !== 1 ? 's' : ''} remaining`,
      disabled: videosLeft === 0,
      onPress: () => openCamera('video'),
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
            Up to 3 photos and 2 videos
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
