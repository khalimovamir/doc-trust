/**
 * AI Lawyer - Settings Screen
 * Design from Figma. Supports Light/Dark theme via useTheme().
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Check,
  UserRound,
  Globe,
  Moon,
  FileText,
  Lightbulb,
  Star,
  LogOut,
} from 'lucide-react-native';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import { useAILawyerTab } from '../context/AILawyerTabContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useSubscription } from '../context/SubscriptionContext';
import { openLanguageSettings } from '../openLanguageSettings';

function SettingsRow({
  icon,
  title,
  subtitle,
  right,
  danger = false,
  compact = false,
  onPress,
  rowStyles,
  colors,
}) {
  const s = rowStyles || {};
  return (
    <TouchableOpacity style={[s.rowCard, compact && s.rowCardCompact]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.rowLeftIcon, danger && s.rowLeftIconDanger]}>{icon}</View>
      <View style={s.rowTextCol}>
        <Text style={[s.rowTitle, danger && s.rowTitleDanger]}>{title}</Text>
        {!!subtitle && <Text style={s.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right || <ChevronRight size={20} color={colors.secondaryText} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

const JURISDICTION_CODES = ['US', 'RU', 'DE', 'KR', 'ES', 'PT'];
const JURISDICTION_FLAGS = {
  US: require('../../assets/flag-us.png'),
  RU: require('../../assets/flag-ru.png'),
  DE: require('../../assets/flag-de.png'),
  KR: require('../../assets/flag-kr.png'),
  ES: require('../../assets/flag-es.png'),
  PT: require('../../assets/flag-pt.png'),
};

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDarkMode, setDarkMode } = useTheme();
  const { setPreviousTab } = useAILawyerTab();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { isPro, features } = useSubscription();

  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);

  useFocusEffect(
    React.useCallback(() => {
      setPreviousTab('Settings');
    }, [setPreviousTab])
  );

  const handleOpenLogoutDialog = () => {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmDescription'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.logout'), style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.appBar}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.profileTop}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EditProfile')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatarCard]}>
                <Image
                  source={isDarkMode ? require('../../assets/default-avatar-dark.png') : require('../../assets/default-avatar.png')}
                  style={styles.defaultAvatarImage}
                  resizeMode="contain"
                />
              </View>
            )}
            <View style={styles.profileTextCol}>
              {!!profile?.full_name?.trim() && (
                <Text style={styles.profileName}>{profile.full_name}</Text>
              )}
              <Text style={styles.profileEmail}>
                {profile?.email || '—'}
              </Text>
            </View>
            <ChevronRight size={24} color={colors.secondaryText} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.proCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Subscription')}
          >
            <View style={styles.proTitleRow}>
              <Text style={styles.proTitle}>{t('settings.proTitle')}</Text>
              <TouchableOpacity
                style={[styles.upgradeBtn, isPro && styles.upgradeBtnActive]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Subscription')}
              >
                <Text style={styles.upgradeText}>{isPro ? t('settings.active') : t('settings.upgrade')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.proList}>
              {(features?.length ? features.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) : [
                { feature: 'document_check' },
                { feature: 'ai_lawyer' },
                { feature: 'document_compare' },
              ]).map((f, i) => {
                const titleKey = f.feature === 'document_check' ? 'settings.proFeatureDocumentCheck' : f.feature === 'ai_lawyer' ? 'settings.proFeatureAILawyer' : f.feature === 'document_compare' ? 'settings.proFeatureDocumentCompare' : null;
                const title = titleKey ? t(titleKey) : (f.title || f);
                return (
                  <View key={f.feature || i} style={styles.proItem}>
                    <Check size={24} color={colors.secondaryText} strokeWidth={2} />
                    <Text style={styles.proItemText}>{title}</Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings.jurisdiction')}</Text>
          <SettingsRow
            icon={
              <Image
                source={JURISDICTION_FLAGS[profile?.jurisdiction_code] || require('../../assets/flag-us.png')}
                style={styles.flagIcon}
                resizeMode="cover"
              />
            }
            title={profile?.jurisdiction_code && JURISDICTION_CODES.includes(profile.jurisdiction_code) ? t('jurisdictions.country' + profile.jurisdiction_code) : t('jurisdictions.countryUS')}
            subtitle={t('settings.jurisdictionSubtitle')}
            rowStyles={styles}
            colors={colors}
            onPress={() => navigation.navigate('Jurisdiction')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings.general')}</Text>
          <SettingsRow
            icon={<UserRound size={24} color={colors.primary} strokeWidth={2} />}
            title={t('settings.personalDetails')}
            subtitle={t('settings.personalDetailsSubtitle')}
            rowStyles={styles}
            colors={colors}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsRow
            icon={<Globe size={24} color={colors.primary} strokeWidth={2} />}
            title={t('common.language')}
            subtitle={t('settings.languageSubtitle')}
            rowStyles={styles}
            colors={colors}
            onPress={openLanguageSettings}
          />
          <SettingsRow
            icon={<Moon size={24} color={colors.primary} strokeWidth={2} />}
            title={t('settings.darkMode')}
            subtitle={t('settings.darkModeSubtitle')}
            rowStyles={styles}
            colors={colors}
            right={
              <Switch
                value={isDarkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.tertiary, true: '#34c759' }}
                thumbColor={colors.secondaryBackground}
                ios_backgroundColor={colors.tertiary}
              />
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings.other')}</Text>
          <SettingsRow
            icon={<FileText size={22} color={colors.primary} strokeWidth={2} />}
            title={t('settings.privacyPolicy')}
            subtitle={t('settings.privacyPolicySubtitle')}
            rowStyles={styles}
            colors={colors}
          />
          <SettingsRow
            icon={<Lightbulb size={22} color={colors.primary} strokeWidth={2} />}
            title={t('settings.featureRequest')}
            subtitle={t('settings.featureRequestSubtitle')}
            rowStyles={styles}
            colors={colors}
            onPress={() => navigation.navigate('FeatureRequest')}
          />
          <SettingsRow
            icon={<Star size={22} color={colors.primary} strokeWidth={2} />}
            title={t('settings.rateTheApp')}
            subtitle={t('settings.rateTheAppSubtitle')}
            rowStyles={styles}
            colors={colors}
            onPress={() => {}}
          />
          <SettingsRow
            icon={<LogOut size={22} color={colors.error} strokeWidth={2} />}
            title={t('common.logout')}
            danger
            compact
            rowStyles={styles}
            colors={colors}
            onPress={handleOpenLogoutDialog}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    appBar: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.primaryBackground,
    },
    headerTitle: {
      fontFamily,
      fontSize: 24,
      fontWeight: '600',
      color: colors.primaryText,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 12,
      paddingHorizontal: spacing.md,
      paddingBottom: 100,
      gap: spacing.sm,
    },
    profileCard: {
      backgroundColor: colors.secondaryBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.tertiary,
      padding: spacing.md,
      gap: spacing.sm,
    },
    profileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 999,
    },
    defaultAvatarCard: {
      backgroundColor: colors.alternate,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    defaultAvatarImage: {
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
    },
    profileTextCol: {
      flex: 1,
      gap: spacing.xxs,
    },
    profileName: {
      fontFamily,
      fontSize: 20,
      fontWeight: '500',
      color: colors.primaryText,
    },
    profileEmail: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      color: colors.secondaryText,
    },
    proCard: {
      backgroundColor: colors.alternate,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    proTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    proTitle: {
      fontFamily,
      fontSize: 20,
      fontWeight: '600',
      color: colors.primaryText,
    },
    upgradeBtn: {
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    upgradeText: {
      fontFamily,
      fontSize: 14,
      fontWeight: '500',
      color: '#ffffff',
    },
    upgradeBtnActive: {
      backgroundColor: colors.success,
    },
    proList: {
      gap: 6,
    },
    proItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    proItemText: {
      flex: 1,
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: colors.secondaryText,
    },
    section: {
      gap: spacing.xs,
    },
    sectionLabel: {
      fontFamily,
      fontSize: 14,
      fontWeight: '500',
      color: colors.secondaryText,
    },
    rowCard: {
      backgroundColor: colors.secondaryBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    rowCardCompact: {
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.tertiary,
    },
    rowLeftIcon: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLeftIconDanger: {
      width: 24,
      height: 24,
    },
    rowTextCol: {
      flex: 1,
      gap: spacing.xxs,
    },
    rowTitle: {
      fontFamily,
      fontSize: 16,
      fontWeight: '400',
      color: colors.primaryText,
    },
    rowTitleDanger: {
      color: colors.error,
    },
    rowSubtitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      color: colors.secondaryText,
    },
    flagCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondaryBackground,
    },
    flagIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
  };
}
