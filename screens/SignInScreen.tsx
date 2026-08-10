// screens/SignInScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { CrossAlert as Alert } from '../src/lib/crossAlert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../src/lib/supabase';
import { Fonts } from '../constants/fonts';
import { normalizeUgandaPhone, displayUgandaPhone } from '../constants/phone';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

type Step = 'phone' | 'otp';

const RESEND_SECONDS = 60;

export default function SignInScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [e164Phone, setE164Phone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendIn(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });

    if (error) {
      if (error.message.toLowerCase().includes('signups not allowed') ||
          error.message.toLowerCase().includes('not found')) {
        Alert.alert(
          'No Account Found',
          "We couldn't find an account with that phone number. Would you like to sign up instead?",
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => navigation.navigate('SignUp') },
          ]
        );
      } else {
        Alert.alert("Couldn't Send Code", error.message);
      }
      return false;
    }
    return true;
  };

  const handleSendCode = async () => {
    const normalized = normalizeUgandaPhone(phoneInput);
    if (!normalized) {
      Alert.alert('Invalid Number', 'Enter a valid Ugandan phone number, e.g. 0771 234 567.');
      return;
    }
    setLoading(true);
    const ok = await sendOtp(normalized);
    setLoading(false);
    if (ok) {
      setE164Phone(normalized);
      setStep('otp');
      startResendTimer();
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    setLoading(true);
    const ok = await sendOtp(e164Phone);
    setLoading(false);
    if (ok) {
      startResendTimer();
      Alert.alert('Code Sent', 'A new code has been sent to your phone.');
    }
  };

  const handleVerify = async () => {
    if (otp.trim().length < 6) {
      Alert.alert('Error', 'Enter the 6-digit code sent to your phone.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token: otp.trim(),
      type: 'sms',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Verification Failed', error.message);
    }
    // On success, UserContext's onAuthStateChange picks up the new session
    // automatically and navigation switches away from the auth stack.
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtp('');
    if (timerRef.current) clearInterval(timerRef.current);
    setResendIn(0);
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>HUSTLE<Text style={s.logoAccent}>UG</Text></Text>
          <Text style={s.subtitle}>Find work. Post jobs. Hustle smart.</Text>
        </View>

        {step === 'phone' ? (
          <View style={s.form}>
            <Text style={s.formTitle}>Welcome back</Text>
            <Text style={s.formSubtitle}>Sign in with your phone number</Text>

            <InputField
              label="Phone Number"
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              placeholder="0771 234 567"
              autoFocus
            />

            <AppButton
              label={loading ? 'Sending code...' : 'Send Code'}
              onPress={handleSendCode}
              disabled={loading}
            />
          </View>
        ) : (
          <View style={s.form}>
            <Text style={s.formTitle}>Enter code</Text>
            <Text style={s.formSubtitle}>
              We sent a 6-digit code to {displayUgandaPhone(e164Phone)}
            </Text>

            <InputField
              label="Verification Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              placeholder="123456"
              maxLength={6}
              autoFocus
            />

            <AppButton
              label={loading ? 'Verifying...' : 'Verify & Sign In'}
              onPress={handleVerify}
              disabled={loading}
            />

            <View style={s.resendRow}>
              <TouchableOpacity onPress={handleResend} disabled={resendIn > 0 || loading}>
                <Text style={[s.resendText, (resendIn > 0 || loading) && s.resendTextDisabled]}>
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChangeNumber}>
                <Text style={s.changeNumberText}>Change number</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={s.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontFamily: Fonts.heading, fontSize: 42, color: colors.text, letterSpacing: 2 },
  logoAccent: { color: colors.primary },
  subtitle: { fontFamily: Fonts.body, fontSize: 14, color: colors.mutedText, marginTop: 6 },
  form: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 24,
    gap: 16,
  },
  formTitle: { fontFamily: Fonts.heading, fontSize: 22, color: colors.text, marginBottom: 4 },
  formSubtitle: { fontFamily: Fonts.body, fontSize: 13, color: colors.mutedText, marginTop: -12, marginBottom: 4 },
  resendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  resendText: { fontFamily: Fonts.body, fontSize: 13, color: colors.primary },
  resendTextDisabled: { color: colors.mutedText },
  changeNumberText: { fontFamily: Fonts.body, fontSize: 13, color: colors.mutedText, textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontFamily: Fonts.body, fontSize: 14, color: colors.mutedText },
  footerLink: { fontFamily: Fonts.heading, fontSize: 14, color: colors.primary },
});
