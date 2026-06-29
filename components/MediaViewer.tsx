// components/MediaViewer.tsx
import React, { useState } from 'react';
import {
  View, Modal, TouchableOpacity, StyleSheet,
  Dimensions, Image, FlatList,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from './MediaPicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Separate component so useVideoPlayer hook is called at component level
function VideoSlide({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.fullVideo}
      contentFit="contain"
      nativeControls
    />
  );
}

interface MediaViewerProps {
  visible: boolean;
  items: MediaItem[];
  startIndex: number;
  onClose: () => void;
}

export default function MediaViewer({ visible, items, startIndex, onClose }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  const renderItem = ({ item }: { item: MediaItem }) => (
    <View style={styles.slide}>
      {item.type === 'photo' ? (
        <Image
          source={{ uri: item.uri }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      ) : (
        <VideoSlide uri={item.uri} />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Media slider */}
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(_, i) => i.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
        />

        {/* Dots indicator */}
        {items.length > 1 && (
          <View style={styles.dots}>
            {items.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  fullVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  dots: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
});
