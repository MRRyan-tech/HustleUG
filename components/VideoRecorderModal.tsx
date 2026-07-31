// components/VideoRecorderModal.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions, getSupportedFeatures } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';

interface VideoRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
  maxDurationSeconds?: number;
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'reviewing';

// Separate component so useVideoPlayer is only mounted once we actually have
// a clip to preview (hooks can't be called conditionally at the top level).
function ReviewPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function VideoRecorderModal({
  visible, onClose, onCapture, maxDurationSeconds = 30,
}: VideoRecorderModalProps) {
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [pauseSupported, setPauseSupported] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const remaining = Math.max(0, maxDurationSeconds - elapsed);
  const isLowTime = remaining <= 5 && state === 'recording';

  // Ask for camera + mic permission as soon as the modal opens
  useEffect(() => {
    if (!visible) return;
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, [visible]);

  // Check once whether this device/OS supports pausing a recording —
  // notably iOS only supports it on iOS 18+, so this can come back false
  // on a lot of the older devices HustleUG targets. Guarded in case this
  // export isn't present in some expo-camera patch version.
  useEffect(() => {
    try {
      const features = typeof getSupportedFeatures === 'function' ? getSupportedFeatures() : null;
      setPauseSupported(!!features?.toggleRecordingAsyncAvailable);
    } catch {
      setPauseSupported(false);
    }
  }, []);

  const resetAll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setState('idle');
    setElapsed(0);
    setRecordedUri(null);
    setCameraReady(false);
  }, []);

  const handleClose = () => {
    if (state === 'recording' || state === 'paused') {
      cameraRef.current?.stopRecording();
    }
    resetAll();
    onClose();
  };

  const startPulse = () => {
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current) return;
    if (!cameraReady) {
      // Starting recordAsync before the native camera session is fully
      // ready is a documented cause of it silently failing on iOS — the
      // button appears pressed but nothing happens. Give it a beat.
      Alert.alert('Camera warming up', 'Give it a second and try again.');
      return;
    }
    setState('recording');
    setElapsed(0);
    startPulse();

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= maxDurationSeconds) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return prev + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: maxDurationSeconds });
      if (intervalRef.current) clearInterval(intervalRef.current);
      pulseAnim.stopAnimation();
      if (video?.uri) {
        setRecordedUri(video.uri);
        setState('reviewing');
      } else {
        resetAll();
      }
    } catch (e) {
      console.error('Recording failed:', e);
      resetAll();
      Alert.alert('Recording failed', 'Please try again.');
    }
  };

  const handleStopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  const handleTogglePause = async () => {
    if (!cameraRef.current || !pauseSupported) return;
    try {
      await (cameraRef.current as any).toggleRecordingAsync?.();
      if (state === 'recording') {
        setState('paused');
        if (intervalRef.current) clearInterval(intervalRef.current);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
      } else if (state === 'paused') {
        setState('recording');
        startPulse();
        intervalRef.current = setInterval(() => {
          setElapsed((prev) => {
            if (prev + 1 >= maxDurationSeconds) {
              if (intervalRef.current) clearInterval(intervalRef.current);
            }
            return prev + 1;
          });
        }, 1000);
      }
    } catch (e) {
      console.error('Toggle pause failed:', e);
    }
  };

  const handleRetake = () => {
    resetAll();
  };

  const handleUseVideo = () => {
    if (recordedUri) {
      onCapture(recordedUri);
    }
    resetAll();
    onClose();
  };

  const s = styles(colors);

  const permissionsReady = cameraPermission?.granted && micPermission?.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={s.root}>
        {!permissionsReady ? (
          <SafeAreaView style={s.permissionWrap}>
            <Ionicons name="videocam-outline" size={48} color={colors.mutedText} />
            <Text style={[s.permissionText, { color: colors.text, fontFamily: Fonts.heading }]}>
              Camera & microphone access needed
            </Text>
            <Text style={[s.permissionSub, { color: colors.mutedText, fontFamily: Fonts.body }]}>
              HustleUG needs this to record a video for your job post.
            </Text>
            <TouchableOpacity style={[s.permissionBtn, { backgroundColor: colors.primary }]} onPress={handleClose}>
              <Text style={[s.permissionBtnText, { fontFamily: Fonts.heading }]}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        ) : state === 'reviewing' && recordedUri ? (
          <>
            <ReviewPlayer uri={recordedUri} />
            <SafeAreaView style={s.reviewControls} edges={['bottom']}>
              <TouchableOpacity style={[s.reviewBtn, s.retakeBtn]} onPress={handleRetake}>
                <Ionicons name="refresh" size={20} color={colors.white} />
                <Text style={[s.reviewBtnText, { fontFamily: Fonts.heading }]}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.reviewBtn, { backgroundColor: colors.primary }]}
                onPress={handleUseVideo}
              >
                <Ionicons name="checkmark" size={20} color={colors.white} />
                <Text style={[s.reviewBtnText, { color: colors.white, fontFamily: Fonts.heading }]}>
                  Use This Video
                </Text>
              </TouchableOpacity>
            </SafeAreaView>
          </>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              mode="video"
              videoQuality="720p"
              onCameraReady={() => setCameraReady(true)}
            />

            <SafeAreaView style={s.topBar} edges={['top']}>
              <TouchableOpacity style={s.iconBtn} onPress={handleClose}>
                <Ionicons name="close" size={26} color={colors.white} />
              </TouchableOpacity>
              {state === 'idle' && (
                <TouchableOpacity
                  style={s.iconBtn}
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                >
                  <Ionicons name="camera-reverse-outline" size={26} color={colors.white} />
                </TouchableOpacity>
              )}
            </SafeAreaView>

            {(state === 'recording' || state === 'paused') && (
              <View style={s.countdownWrap} pointerEvents="none">
                <Animated.View
                  style={[
                    s.countdownCircle,
                    { borderColor: isLowTime ? colors.danger : colors.primary },
                    state === 'recording' && { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Text style={[
                    s.countdownNumber,
                    { color: isLowTime ? colors.danger : colors.white, fontFamily: Fonts.heading },
                  ]}>
                    {remaining}
                  </Text>
                </Animated.View>
                {state === 'paused' && (
                  <Text style={[s.pausedLabel, { fontFamily: Fonts.heading }]}>PAUSED</Text>
                )}
              </View>
            )}

            <SafeAreaView style={s.bottomBar} edges={['bottom']}>
              {state === 'idle' ? (
                <TouchableOpacity
                  style={[s.recordOuter, !cameraReady && { opacity: 0.4 }]}
                  onPress={handleStartRecording}
                >
                  <View style={[s.recordInner, { backgroundColor: colors.danger }]} />
                </TouchableOpacity>
              ) : (
                <View style={s.activeControls}>
                  {pauseSupported && (
                    <TouchableOpacity style={s.iconBtn} onPress={handleTogglePause}>
                      <Ionicons
                        name={state === 'paused' ? 'play' : 'pause'}
                        size={26}
                        color={colors.white}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.recordOuter} onPress={handleStopRecording}>
                    <View style={[s.recordInner, s.recordInnerStop, { backgroundColor: colors.danger }]} />
                  </TouchableOpacity>
                  {pauseSupported && <View style={s.iconBtn} />}
                </View>
              )}
              <Text style={s.hintText}>
                {state === 'idle'
                  ? cameraReady
                    ? `Tap to record — max ${maxDurationSeconds}s`
                    : 'Camera warming up...'
                  : state === 'paused'
                  ? 'Recording paused'
                  : 'Recording...'}
              </Text>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  countdownWrap: {
    position: 'absolute', top: '12%', left: 0, right: 0,
    alignItems: 'center',
  },
  countdownCircle: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  countdownNumber: { fontSize: 26 },
  pausedLabel: {
    marginTop: 10, color: '#FFFFFF', fontSize: 13, letterSpacing: 2,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: 20, gap: 10,
  },
  activeControls: {
    flexDirection: 'row', alignItems: 'center', gap: 28,
  },
  recordOuter: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  recordInner: {
    width: 60, height: 60, borderRadius: 30,
  },
  recordInnerStop: {
    width: 28, height: 28, borderRadius: 6,
  },
  hintText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4,
  },
  reviewControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 16,
  },
  reviewBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16,
  },
  retakeBtn: { backgroundColor: 'rgba(255,255,255,0.15)' },
  reviewBtnText: { color: '#FFFFFF', fontSize: 15 },
  permissionWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 10,
  },
  permissionText: { fontSize: 17, textAlign: 'center', marginTop: 8 },
  permissionSub: { fontSize: 13, textAlign: 'center' },
  permissionBtn: { marginTop: 16, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 14 },
  permissionBtnText: { color: '#FFFFFF', fontSize: 14 },
});
