// screens/SignUpScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../src/lib/supabase';
import { Fonts } from '../constants/fonts';
import { normalizeUgandaPhone, displayUgandaPhone } from '../constants/phone';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';

type UserRole = 'seeker' | 'employer';
type Props = { navigation: NativeStackNavigationProp<any> };
type Step = 'details' | 'otp';

const RESEND_SECONDS = 60;

export default function SignUpScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('details');
  const [role, setRole] = useState<UserRole>('seeker');
  const [fullName, setFullName] = useState('');
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
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName.trim(), role },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')) {
        Alert.alert(
          'Account Already Exists',
          'That phone number is already registered. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('SignIn') },
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
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name.');
      return;
    }
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
    // On success, the `on_auth_user_created` DB trigger creates the profiles
    // row from user_metadata (full_name, role), and UserContext picks up the
    // new session automatically via onAuthStateChange.
  };

  const handleChangeNumber = () => {
    setStep('details');
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
          <Text style={s.subtitle}>Create your account</Text>
        </View>

        {step === 'details' ? (
          <>
            <View style={s.roleRow}>
              <TouchableOpacity
                style={[s.roleBtn, role === 'seeker' && s.roleBtnActive]}
                onPress={() => setRole('seeker')}
              >
                <Ionicons name="briefcase-outline" size={20} color={role === 'seeker' ? colors.primary : colors.mutedText} />
                <Text style={[s.roleLabel, role === 'seeker' && s.roleLabelActive]}>Job Seeker</Text>
                <Text style={s.roleDesc}>I'm looking for work</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.roleBtn, role === 'employer' && s.roleBtnActive]}
                onPress={() => setRole('employer')}
              >
                <Ionicons name="business-outline" size={20} color={role === 'employer' ? colors.primary : colors.mutedText} />
                <Text style={[s.roleLabel, role === 'employer' && s.roleLabelActive]}>Employer</Text>
                <Text style={s.roleDesc}>I'm hiring</Text>
              </TouchableOpacity>
            </View>

            <View style={s.form}>
              <InputField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="John Ssemakula" autoCapitalize="words" />
              <InputField
                label="Phone Number"
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                placeholder="0771 234 567"
              />
              <AppButton label={loading ? 'Sending code...' : 'Send Code'} onPress={handleSendCode} disabled={loading} />
            </View>
          </>
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
              label={loading ? 'Verifying...' : 'Verify & Create Account'}
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
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={s.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontFamily: Fonts.heading, fontSize: 38, color: colors.text, letterSpacing: 2 },
  logoAccent: { color: colors.primary },
  subtitle: { fontFamily: Fonts.body, fontSize: 14, color: colors.mutedText, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: {
    flex: 1, backgroundColor: colors.card, borderWidth: 2,
    borderColor: colors.border, borderRadius: 12, padding: 16, alignItems: 'center', gap: 6,
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleLabel: { fontFamily: Fonts.heading, fontSize: 14, color: colors.mutedText },
  roleLabelActive: { color: colors.primary },
  roleDesc: { fontFamily: Fonts.body, fontSize: 11, color: colors.mutedText },
  form: {
    backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 2, borderColor: colors.border, padding: 24, gap: 16,
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
