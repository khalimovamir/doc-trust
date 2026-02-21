/**
 * AI Lawyer - Comparing Screen
 * Calls compare-documents Edge Function, then navigates to ComparingResult.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Circle } from 'lucide-react-native';
import { IconCircleCheckFilled } from '@tabler/icons-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import Skeleton from '../components/Skeleton';
import { compareDocuments } from '../lib/ai';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'];

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.md, paddingTop: 24, paddingBottom: 40 },
    skeletonBlock: { marginBottom: spacing.xl },
    skeletonSummary: { height: 72, borderRadius: 16, marginBottom: spacing.md },
    skeletonDocsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
    skeletonDoc: { flex: 1, height: 80, borderRadius: 16 },
    skeletonFilters: { flexDirection: 'row', gap: 8, marginBottom: spacing.xl },
    skeletonChip: { width: 72, height: 40, borderRadius: 20 },
    content: { alignItems: 'center', paddingHorizontal: 24 },
    title: { fontFamily, fontSize: 24, fontWeight: '700', color: colors.primaryText, textAlign: 'center', marginTop: spacing.lg },
    subtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', marginTop: spacing.sm },
    progressList: { marginTop: spacing.xl, width: '100%' },
    progressItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: spacing.sm },
    progressLabel: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, flex: 1 },
  };
}

export default function ComparingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const document1Text = route.params?.document1Text || '';
  const document2Text = route.params?.document2Text || '';
  const document1Name = route.params?.document1Name || '';
  const document2Name = route.params?.document2Name || '';

  const [doneStep, setDoneStep] = useState(0);

  useEffect(() => {
    if (!document1Text || !document2Text) {
      navigation.replace('CompareDocs');
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < STEP_KEYS.length; i++) {
        if (cancelled) return;
        setDoneStep(i);
        await new Promise((r) => setTimeout(r, 400));
      }
      if (cancelled) return;
      try {
        const result = await compareDocuments(document1Text, document2Text);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.skeletonBlock}>
          <Skeleton width="100%" height={72} borderRadius={16} style={styles.skeletonSummary} />
          <View style={styles.skeletonDocsRow}>
            <View style={styles.skeletonDoc}>
              <Skeleton height={80} borderRadius={16} style={{ width: '100%' }} />
            </View>
            <View style={styles.skeletonDoc}>
              <Skeleton height={80} borderRadius={16} style={{ width: '100%' }} />
            </View>
          </View>
          <View style={styles.skeletonFilters}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width={72} height={40} borderRadius={20} style={styles.skeletonChip} />
            ))}
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{t('comparing.title')}</Text>
          <Text style={styles.subtitle}>{t('comparing.subtitle')}</Text>
          <View style={styles.progressList}>
            {STEP_KEYS.map((key, i) => (
              <View key={key} style={styles.progressItem}>
                {i <= doneStep ? (
                  <IconCircleCheckFilled size={24} color={colors.success} />
                ) : (
                  <Circle size={24} color={colors.tertiary} strokeWidth={2} />
                )}
                <Text style={styles.progressLabel}>{t('comparing.' + key)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

