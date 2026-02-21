/**
 * AI Lawyer - Analyzing Screen
 * Calls Gemini via Edge Function, then navigates to Details
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle } from 'lucide-react-native';
import { IconCircleCheckFilled } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, spacing, useTheme } from '../theme';
import Skeleton from '../components/Skeleton';
import { useAnalysis } from '../context/AnalysisContext';
import { useProfile } from '../context/ProfileContext';
import { analyzeDocument } from '../lib/ai';
import { getAppLanguageCode } from '../i18n';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'];

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
    title: { fontFamily, fontSize: 24, fontWeight: '700', color: colors.primaryText, textAlign: 'center', marginTop: spacing.xl },
    subtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', marginTop: spacing.sm },
    progressList: { marginTop: spacing.xl, width: '100%' },
    progressItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: spacing.sm },
    progressLabel: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, flex: 1 },
  };
}

export default function AnalyzingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { setAnalysis } = useAnalysis();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const documentText = route.params?.documentText || '';
  const source = route.params?.source || 'paste';
  const [doneStep, setDoneStep] = useState(0);

  useEffect(() => {
    if (!documentText) {
      navigation.replace('Home');
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < STEP_KEYS.length; i++) {
        if (cancelled) return;
        setDoneStep(i);
        await new Promise((r) => setTimeout(r, 500));
      }
      if (cancelled) return;
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
              { name: 'AnalysisResult', params: { documentText, source } },
            ],
          })
        );
      } catch (e) {
        if (cancelled) return;
        Alert.alert(
          'Analysis failed',
          e?.message || 'Could not analyze document. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };
    run();
    return () => { cancelled = true; };
  }, [documentText, source, profile?.jurisdiction_code, navigation, setAnalysis]);
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <Text style={styles.title}>{t('analysis.analyzingTitle')}</Text>
        <Text style={styles.subtitle}>{t('analysis.analyzingSubtitle')}</Text>

        <View style={styles.progressList}>
          {STEP_KEYS.map((key, i) => (
            <View key={key} style={styles.progressItem}>
              {i <= doneStep ? (
                <IconCircleCheckFilled size={24} color={colors.success} />
              ) : (
                <Circle size={24} color={colors.tertiary} strokeWidth={2} />
              )}
              <Text style={styles.progressLabel}>{t('analysis.' + key)}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

