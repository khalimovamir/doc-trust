/**
 * AI Lawyer - Analyzing Screen
 * Extracts text from scan images (if any), then calls Gemini; navigates to AnalysisResult.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { useAnalysis } from '../context/AnalysisContext';
import { useProfile } from '../context/ProfileContext';
import { analyzeDocument } from '../lib/ai';
import { getTextFromImageUri } from '../lib/uploadDocument';
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

export default function AnalyzingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { setAnalysis } = useAnalysis();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const documentTextParam = route.params?.documentText || '';
  const scanImages = route.params?.scanImages || null;
  const source = route.params?.source || 'paste';

  useEffect(() => {
    const hasText = documentTextParam.trim().length > 0;
    const hasScans = Array.isArray(scanImages) && scanImages.length > 0;
    if (!hasText && !hasScans) {
      navigation.replace('Home');
      return;
    }

    let cancelled = false;
    const run = async () => {
      let documentText = documentTextParam;
      if (hasScans) {
        try {
          const parts = [];
          for (let i = 0; i < scanImages.length; i++) {
            if (cancelled) return;
            const { uri, mimeType } = scanImages[i];
            const text = await getTextFromImageUri(uri, mimeType || 'image/jpeg');
            if (text && text.trim()) {
              if (parts.length > 0) parts.push('\n\n--- \n\n');
              parts.push(text.trim());
            }
          }
          documentText = parts.join('');
          if (!documentText || documentText.length < 10) {
            if (cancelled) return;
            Alert.alert(
              t('common.error'),
              t('scanner.noTextFound'),
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
          }
        } catch (e) {
          if (cancelled) return;
          Alert.alert(
            t('common.error'),
            e?.message || t('scanner.noTextFound'),
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      }

      try {
        const jurisdiction = profile?.jurisdiction_code || 'US';
        const language = getAppLanguageCode();
        const result = await analyzeDocument(documentText, { jurisdiction, language });
        if (cancelled) return;
        setAnalysis({ ...result, text_content: documentText });
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'Home' },
              { name: 'AnalysisResult', params: { documentText, source, fromAnalyzing: true } },
            ],
          })
        );
      } catch (e) {
        if (cancelled) return;
        Alert.alert(
          t('common.error'),
          e?.message || 'Could not analyze document. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };
    run();
    return () => { cancelled = true; };
  }, [documentTextParam, scanImages, source, profile?.jurisdiction_code, navigation, setAnalysis, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        <Text style={styles.title}>{t('analysis.analyzingTitle')}</Text>
        <Text style={styles.subtitle}>{t('analysis.analyzingSubtitle')}</Text>
      </View>
    </SafeAreaView>
  );
}

