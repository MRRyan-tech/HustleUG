// components/MediaCollage.tsx
// Shows photos on left, videos on right in a collage grid
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';
import Spacing from '../constants/spacing';
import { MediaItem } from './MediaPicker';
import MediaViewer from './MediaViewer';

interface MediaCollageProps {
  media: MediaItem[];
}

export default function MediaCollage({ media }: MediaCollageProps) {
  const { colors } = useTheme();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const photos = media.filter((m) => m.type === 'photo');
  const videos = media.filter((m) => m.type === 'video');

  // All media in one array for the viewer
  const allMedia = [...photos, ...videos];

  const openViewer = (item: MediaItem) => {
    const index = allMedia.findIndex((m) => m.uri === item.uri);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  if (media.length === 0) {
    return (
      <View style={[styles.noMedia, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
        <Ionicons name="images-outline" size={32} color={colors.mutedText} />
        <Text style={[styles.noMediaText, { color: colors.mutedText, fontFamily: Fonts.body }]}>
          No media available for this job
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionLabel, { color: colors.text, fontFamily: Fonts.heading }]}>
        Media for this job
      </Text>

      <View style={styles.collage}>
        {/* Left — Photos */}
        {photos.length > 0 && (
          <View style={styles.column}>
            <Text style={[styles.colLabel, { color: colors.mutedText, fontFamily: Fonts.heading }]}>
              📷 Photos
            </Text>
            {photos.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.mediaTile}
                onPress={() => openViewer(item)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.tileImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
                <View style={styles.tileOverlay}>
                  <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Divider if both */}
        {photos.length > 0 && videos.length > 0 && (
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        )}

        {/* Right — Videos */}
        {videos.length > 0 && (
          <View style={styles.column}>
            <Text style={[styles.colLabel, { color: colors.mutedText, fontFamily: Fonts.heading }]}>
              🎥 Videos
            </Text>
            {videos.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.mediaTile}
                onPress={() => openViewer(item)}
                activeOpacity={0.85}
              >
                {/* Video thumbnail — dark background with play icon */}
                <View style={[styles.videoThumb, { backgroundColor: colors.black }]}>
                  <View style={styles.playBtn}>
                    <Ionicons name="play-circle" size={44} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.videoLabel, { fontFamily: Fonts.heading }]}>
                    Tap to play
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Full screen viewer */}
      <MediaViewer
        visible={viewerVisible}
        items={allMedia}
        startIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  sectionLabel: {
    fontSize: 15,
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  noMedia: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  noMediaText: { fontSize: 13, textAlign: 'center' },
  collage: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  column: {
    flex: 1,
    gap: Spacing.sm,
  },
  colLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  divider: {
    width: 1.5,
    borderRadius: 1,
  },
  mediaTile: {
    borderRadius: 10,
    overflow: 'hidden',
    height: 120,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    padding: 4,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
  },
  playBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  videoLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.5,
    opacity: 0.8,
  },
});
