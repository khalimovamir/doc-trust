/**
 * AI Lawyer - Comparing Screen
 * Calls compare-documents Edge Function, then navigates to ComparingResult.
 * Layout matches AnalyzingScreen: Loading, title, description only.
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fontFamily, spacing, useTheme } from '../theme';
import { useProfile } from '../context/ProfileContext';
import { compareDocuments } from '../lib/ai';
import { getAppLanguageCode } from '../i18n';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
    loader: { marginBottom: spacing.lg },
    title: { fontFamily, fontSize: 24, fontWeight: '700', color: colors.primaryText, textAlign: 'center', marginTop: spacing.xl },
    subtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', marginTop: spacing.sm },
  };
}

export default function ComparingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const document1Text = route.params?.document1Text || '';
  const document2Text = route.params?.document2Text || '';
  const document1Name = route.params?.document1Name || '';
  const document2Name = route.params?.document2Name || '';

  useEffect(() => {
    if (!document1Text || !document2Text) {
      navigation.replace('CompareDocs');
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const jurisdiction = profile?.jurisdiction_code || 'US';
        const language = getAppLanguageCode();
        const result = await compareDocuments(document1Text, document2Text, { jurisdiction, language });
        if (cancelled) return;
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'Home' },
              {
                name: 'ComparingResult',
                params: {
                  result,
                  document1Name,
                  document2Name,
                },
              },
            ],
          })
        );
      } catch (e) {
        if (cancelled) return;
        Alert.alert(
          t('comparing.errorTitle'),
          e?.message || t('comparing.errorMessage'),
          [{ text: t('common.close'), onPress: () => navigation.goBack() }]
        );
      }
    };
    run();
    return () => { cancelled = true; };
  }, [document1Text, document2Text, document1Name, document2Name, navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        <Text style={styles.title}>{t('comparing.title')}</Text>
        <Text style={styles.subtitle}>{t('comparing.subtitle')}</Text>
      </View>
    </SafeAreaView>
  );
}

