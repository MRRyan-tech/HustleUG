// navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import FindWorkScreen from '../screens/FindWorkScreen';
import PostJobScreen from '../screens/PostJobScreen';
import ProfileScreen from '../screens/ProfileScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';
import AppliedJobsScreen from '../screens/AppliedJobsScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { Fonts } from '../constants/fonts';

export type TabParamList = {
  Home: undefined;
  FindWork: undefined;
  PostJob: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: { screen?: keyof TabParamList };
  JobDetails: { jobId: string };
  AppliedJobs: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

const Tab      = createBottomTabNavigator<TabParamList>();
const Stack    = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1.5,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.heading,
          fontSize: 10,
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home:     focused ? 'home'         : 'home-outline',
            FindWork: focused ? 'search'       : 'search-outline',
            PostJob:  focused ? 'add-circle'   : 'add-circle-outline',
            Profile:  focused ? 'person'       : 'person-outline',
          };
          return (
            <View style={[styles.iconWrap, focused && { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={icons[route.name]} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="FindWork" component={FindWorkScreen} options={{ tabBarLabel: 'Find Work' }} />
      <Tab.Screen name="PostJob"  component={PostJobScreen}  options={{ tabBarLabel: 'Post Job' }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}  options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"    component={MainTabs} />
      <Stack.Screen name="JobDetails"  component={JobDetailsScreen} />
      <Stack.Screen name="AppliedJobs" component={AppliedJobsScreen} />
    </Stack.Navigator>
  );
}

function AuthNavigator() {
  const { colors } = useTheme();
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigation() {
  const { session, loading, activeRole, seekerProfile, employerProfile } = useUser();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Use activeRole (from DB) + sub-profile existence to gate onboarding
  const onboardingComplete =
    activeRole === 'seeker'   ? !!seekerProfile :
    activeRole === 'employer' ? !!employerProfile :
    false;

  if (!onboardingComplete) {
    return (
      <NavigationContainer>
        <OnboardingScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
