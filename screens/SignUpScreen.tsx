// screens/SignUpScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../src/lib/supabase';
import { Fonts } from '../constants/fonts';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';

type UserRole = 'seeker' | 'employer';
type Props = { navigation: NativeStackNavigationProp<any> };

export default function SignUpScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [role, setRole] = useState<UserRole>('seeker');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim(), role } },
    });
    if (error) Alert.alert('Sign Up Failed', error.message);
    setLoading(false);
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>HUSTLE<Text style={s.logoAccent}>UG</Text></Text>
          <Text style={s.subtitle}>Create your account</Text>
        </View>

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
          <InputField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Min. 6 characters"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />
          <InputField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            placeholder="Re-enter password"
          />
          <AppButton label={loading ? 'Creating account...' : 'Create Account'} onPress={handleSignUp} disabled={loading} />
        </View>

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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontFamily: Fonts.body, fontSize: 14, color: colors.mutedText },
  footerLink: { fontFamily: Fonts.heading, fontSize: 14, color: colors.primary },
});
