// components/AppLoadingScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Fonts } from '../constants/fonts';

const { width } = Dimensions.get('window');

interface AppLoadingScreenProps {
  onFinish: () => void;
}

export default function AppLoadingScreen({ onFinish }: AppLoadingScreenProps) {
  const logoScale    = useRef(new Animated.Value(0.7)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const barWidth     = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Tagline fades in
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
      // Progress bar fills
      Animated.timing(barWidth, { toValue: width * 0.6, duration: 900, useNativeDriver: false }),
      // Fade out
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Background gradient effect using layered views */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      {/* Logo area */}
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <View style={styles.iconBox}>
          <Text style={styles.iconLetter}>H</Text>
        </View>
        <Text style={styles.appName}>
          <Text style={styles.appNameHustle}>Hustle</Text>
          <Text style={styles.appNameUG}>UG</Text>
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        Work. Earn. Hustle.
      </Animated.Text>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      {/* Made in Uganda */}
      <Animated.Text style={[styles.madeIn, { opacity: tagOpacity }]}>
        🇺🇬  Made in Uganda, for Ugandans
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  // Diagonal red/black background mimicking icon
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0D0D',
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '40%',
    backgroundColor: '#0D0D0D',
  },
  logoWrap: { alignItems: 'center', gap: 12 },
  iconBox: {
    width: 90, height: 90,
    borderRadius: 22,
    backgroundColor: '#00C853',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  iconLetter: {
    fontSize: 52,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    lineHeight: 58,
  },
  appName: { flexDirection: 'row' },
  appNameHustle: {
    fontSize: 42,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appNameUG: {
    fontSize: 42,
    fontFamily: Fonts.heading,
    color: '#00C853',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 16,
    letterSpacing: 1,
  },
  barTrack: {
    width: width * 0.6,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginTop: 40,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    backgroundColor: '#00C853',
    borderRadius: 2,
  },
  madeIn: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
});
