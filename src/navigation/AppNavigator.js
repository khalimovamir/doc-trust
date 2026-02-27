/**
 * AI Lawyer - App Navigator
 * Two stacks:
 *  - AuthStack (Onboarding, GetStarted, SignIn, SignUp, Forgot password)
 *  - AppStack  (Home tabs + all inner screens)
 * Which one renders depends on Supabase session from AuthContext.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { AILawyerChatProvider } from '../context/AILawyerChatContext';

import OnboardingScreen from '../screens/OnboardingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import EnterEmailScreen from '../screens/EnterEmailScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import DoneScreen from '../screens/DoneScreen';

import HomeTabNavigator from './HomeTabNavigator';
import DetailsScreen from '../screens/DetailsScreen';
import AnalysisResultScreen from '../screens/AnalysisResultScreen';
import JurisdictionScreen from '../screens/JurisdictionScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FeatureRequestScreen from '../screens/FeatureRequestScreen';
import SendIdeaScreen from '../screens/SendIdeaScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ScannerScreen from '../screens/ScannerScreen';
import PasteTextScreen from '../screens/PasteTextScreen';
import UploadFileScreen from '../screens/UploadFileScreen';
import CompareDocsScreen from '../screens/CompareDocsScreen';
import AnalyzingScreen from '../screens/AnalyzingScreen';
import ComparingScreen from '../screens/ComparingScreen';
import ComparingResultScreen from '../screens/ComparingResultScreen';
import ChatScreen from '../screens/ChatScreen';
import AILawyerScreen from '../screens/AILawyerScreen';
import { parseOfferDeepLink } from '../lib/deepLinks';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const headerWithBackOptions = useMemo(() => ({
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.primaryBackground },
    headerTintColor: colors.primaryText,
    headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
    headerTitleAlign: 'center',
    headerBackTitleVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  }), [colors]);
  const authHeaderOptions = useMemo(() => ({
    ...headerWithBackOptions,
    headerStyle: { backgroundColor: colors.secondaryBackground },
  }), [headerWithBackOptions, colors.secondaryBackground]);
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="GetStarted" component={GetStartedScreen} />
      <AuthStack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ ...authHeaderOptions, headerShown: true, title: t('screens.signUp') }}
      />
      <AuthStack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ ...authHeaderOptions, headerShown: true, title: t('screens.signIn') }}
      />
      <AuthStack.Screen
        name="EnterEmail"
        component={EnterEmailScreen}
        options={{ ...authHeaderOptions, headerShown: true, title: t('screens.enterEmail') }}
      />
      <AuthStack.Screen
        name="VerifyCode"
        component={VerifyCodeScreen}
        options={{ ...authHeaderOptions, headerShown: true, title: t('screens.verifyCode') }}
      />
      <AuthStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ ...authHeaderOptions, headerShown: true, title: t('screens.changePassword') }}
      />
      <AuthStack.Screen name="Done" component={DoneScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigatorInner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const headerWithBackOptions = useMemo(() => ({
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.primaryBackground },
    headerTintColor: colors.primaryText,
    headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
    headerTitleAlign: 'center',
    headerBackTitleVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  }), [colors]);
  return (
    <AILawyerChatProvider>
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen
          name="Home"
          component={HomeTabNavigator}
          options={{ freezeOnBlur: false }}
        />
        <AppStack.Screen
          name="Details"
          component={DetailsScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.details') }}
        />
        <AppStack.Screen
          name="AILawyer"
          component={AILawyerScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.aiLawyer') }}
        />
        <AppStack.Screen
          name="AnalysisResult"
          component={AnalysisResultScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.analysis') }}
        />
        <AppStack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            ...headerWithBackOptions,
            headerShown: true,
            title: t('screens.aiLawyer'),
          }}
        />
        <AppStack.Screen
          name="Jurisdiction"
          component={JurisdictionScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.jurisdiction') }}
        />
        <AppStack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.editProfile') }}
        />
        <AppStack.Screen
          name="FeatureRequest"
          component={FeatureRequestScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.featureRequest') }}
        />
        <AppStack.Screen
          name="SendIdea"
          component={SendIdeaScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.sendIdea') }}
        />
        <AppStack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.subscription'), headerStyle: { backgroundColor: colors.secondaryBackground } }}
        />
        <AppStack.Screen name="Scanner" component={ScannerScreen} />
        <AppStack.Screen
          name="PasteText"
          component={PasteTextScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.pasteDocText') }}
        />
        <AppStack.Screen
          name="UploadFile"
          component={UploadFileScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.uploadFile') }}
        />
        <AppStack.Screen
          name="CompareDocs"
          component={CompareDocsScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.compareDocs') }}
        />
        <AppStack.Screen
          name="Analyzing"
          component={AnalyzingScreen}
          options={{ gestureEnabled: false }}
        />
        <AppStack.Screen
          name="Comparing"
          component={ComparingScreen}
          options={{ gestureEnabled: false }}
        />
        <AppStack.Screen
          name="ComparingResult"
          component={ComparingResultScreen}
          options={{ ...headerWithBackOptions, headerShown: true, title: t('screens.comparingResult') }}
        />
      </AppStack.Navigator>
    </AILawyerChatProvider>
  );
}

export default function AppNavigator({ onNavigationRefReady }) {
  const { session, user, isLoading, pendingPasswordReset } = useAuth();
  const { colors } = useTheme();
  const navigationRef = useNavigationContainerRef();
  const isAuthenticated = !!(session?.access_token && user?.id);
  const showAuthStack = !isAuthenticated || pendingPasswordReset;

  React.useEffect(() => {
    onNavigationRefReady?.(navigationRef);
  }, [onNavigationRefReady]);

  useEffect(() => {
    const handleUrl = (url) => {
      const offerId = parseOfferDeepLink(url);
      if (offerId == null || showAuthStack) return;
      setTimeout(() => {
        navigationRef.current?.navigate('Subscription', { fromOffer: true, offerId: String(offerId) });
      }, 100);
    };
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [showAuthStack]);

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.primaryBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {showAuthStack ? <AuthNavigator /> : <AppNavigatorInner />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
