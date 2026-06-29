// screens/SignInScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../src/lib/supabase';
import { Fonts } from '../constants/fonts';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function SignInScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) Alert.alert('Sign In Failed', error.message);
    setLoading(false);
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>HUSTLE<Text style={s.logoAccent}>UG</Text></Text>
          <Text style={s.subtitle}>Find work. Post jobs. Hustle smart.</Text>
        </View>

        <View style={s.form}>
          <Text style={s.formTitle}>Welcome back</Text>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <TouchableOpacity style={s.forgotBtn}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <AppButton
            label={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleSignIn}
            disabled={loading}
          />
        </View>

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
  forgotBtn: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { fontFamily: Fonts.body, fontSize: 13, color: colors.primary },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontFamily: Fonts.body, fontSize: 14, color: colors.mutedText },
  footerLink: { fontFamily: Fonts.heading, fontSize: 14, color: colors.primary },
});
