// components/PostJobLoader.tsx
import React, { useEffect, useRef } from 'react';
import { View, Modal, Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';

interface PostJobLoaderProps {
  visible: boolean;
  label?: string;
  success?: boolean;
}

function BouncingBall({ delay, colors }: { delay: number; colors: any }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const shadowScale = useRef(new Animated.Value(1.5)).current;
  const shadowOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(translateY, { toValue: -40, duration: 250, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.parallel([
              Animated.timing(shadowScale, { toValue: 0.2, duration: 250, useNativeDriver: true }),
              Animated.timing(shadowOpacity, { toValue: 0.4, duration: 250, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(shadowScale, { toValue: 1.5, duration: 250, useNativeDriver: true }),
              Animated.timing(shadowOpacity, { toValue: 0.7, duration: 250, useNativeDriver: true }),
            ]),
          ]),
        ]),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  return (
    <View style={styles.ballWrapper}>
      <Animated.View
        style={[
          styles.ball,
          { backgroundColor: colors.primary },
          { transform: [{ translateY }] },
        ]}
      />
      <Animated.View
        style={[
          styles.shadow,
          { transform: [{ scaleX: shadowScale }], opacity: shadowOpacity },
        ]}
      />
    </View>
  );
}

export default function PostJobLoader({ visible, label, success = false }: PostJobLoaderProps) {
  const { colors } = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!success ? (
            <>
              <View style={styles.loaderWrapper}>
                <BouncingBall delay={0} colors={colors} />
                <BouncingBall delay={200} colors={colors} />
                <BouncingBall delay={300} colors={colors} />
              </View>
              <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.heading }]}>
                {label ?? 'Posting your job...'}
              </Text>
              <Text style={[styles.sublabel, { color: colors.mutedText, fontFamily: Fonts.body }]}>
                This won't take long
              </Text>
            </>
          ) : (
            <>
              <View style={styles.successIcons}>
                <Text style={styles.successEmoji}>😊</Text>
                <Text style={styles.successEmoji}>👍</Text>
              </View>
              <Text style={[styles.successTitle, { color: colors.primary, fontFamily: Fonts.heading }]}>
                Congratulations!
              </Text>
              <Text style={[styles.successMessage, { color: colors.text, fontFamily: Fonts.body }]}>
                Your job has been posted successfully.
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 260,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  loaderWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 70,
    gap: 16,
    marginBottom: 8,
  },
  ballWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 70,
  },
  ball: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  shadow: {
    width: 20,
    height: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  successIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  successEmoji: {
    fontSize: 52,
  },
  successTitle: {
    fontSize: 22,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
