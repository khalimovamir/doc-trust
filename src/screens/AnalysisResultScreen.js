/**
 * AI Lawyer - Analysis Result (post-analysis, not yet saved)
 * Shown right after AnalyzingScreen. Save or open chat writes to Supabase.
 * Menu: Export PDF only. Guidance: no checkboxes. Bottom: Save + round Ask AI (56) with logo.
 * Changing Jurisdiction re-runs analysis.
 */

import React, { useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, EllipsisVertical } from 'lucide-react-native';
import { MenuView } from '@react-native-menu/menu';
import { fontFamily, spacing, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { SkeletonDetails } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useAnalysis } from '../context/AnalysisContext';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { analyzeDocument } from '../lib/ai';
import { getAppLanguageCode } from '../i18n';
import { saveDocumentWithAnalysis } from '../lib/documents';
import { exportAnalysisToPdf } from '../lib/exportPdf';
import { useTranslation } from 'react-i18next';
import {
  ScoreRing,
  SummaryContent,
  IssueCard,
  GuidanceCard,
  DraggableSegmentedControl,
  TABS_KEYS,
  getNormalizedRedFlags,
  getRedFlagsFilters,
  RED_FLAGS_ITEMS,
  GUIDANCE_ITEMS,
  detailsCreateStyles,
  getSeverityConfig,
  getIssueTypeConfig,
} from './DetailsScreen';

export default function AnalysisResultScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { analysis, setAnalysis } = useAnalysis();
  const { openChat } = useAILawyerChat();
  const documentText = route.params?.documentText || '';
  const source = route.params?.source || 'paste';
  const tabLabels = TABS_KEYS.map((k) => t('analysis.' + k));
  const styles = useMemo(() => StyleSheet.create(detailsCreateStyles(colors)), [colors]);
  const severityConfig = useMemo(() => getSeverityConfig(colors), [colors]);
  const issueTypeConfig = useMemo(() => getIssueTypeConfig(colors), [colors]);
  const localStyles = useMemo(() => StyleSheet.create(createLocalStyles(colors)), [colors]);
  const menuActions = React.useMemo(
    () => [{ id: 'export', title: t('details.exportPdf') }],
    [t]
  );

  const [activeTab, setActiveTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const lastJurisdictionRef = useRef(profile?.jurisdiction_code);
  const fromJurisdictionRef = useRef(false);

  const rawRedFlags = analysis?.redFlags || RED_FLAGS_ITEMS;
  const redFlags = getNormalizedRedFlags(rawRedFlags);
  const guidance = analysis?.guidance || GUIDANCE_ITEMS;
  const score = typeof analysis?.score === 'number' ? analysis.score : 35;
  const title = analysis?.documentType || 'Document';
  const criticalCount = redFlags.filter((r) => r.type === 'critical').length;
  const warningCount = redFlags.filter((r) => r.type === 'warning').length;

  const saveToSupabase = useCallback(async () => {
    if (!user?.id || !documentText || !source || !analysis) return null;
    const { analysis: saved } = await saveDocumentWithAnalysis(user.id, documentText, source, analysis);
    return saved;
  }, [user?.id, documentText, source, analysis]);

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      Alert.alert(t('details.signInRequiredTitle'), t('details.signInRequiredSave'));
      return;
    }
    setSaving(true);
    try {
      await saveToSupabase();
      navigation.getParent()?.dispatch(
        require('@react-navigation/native').CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } catch (e) {
      Alert.alert(t('details.saveFailed'), e?.message || t('details.couldNotSave'));
    } finally {
      setSaving(false);
    }
  }, [user?.id, saveToSupabase, navigation]);

  const handleAskAI = useCallback(
    (issueItem) => {
      if (issueItem) {
        const copyText = [issueItem.title, '', 'Why this matters:', issueItem.whyMatters || '', '', 'What to do:', issueItem.whatToDo || ''].filter(Boolean).join('\n');
        const context = {
          source: 'details',
          type: 'issue',
          title: `${issueItem.section || 'Document'} — ${issueItem.title}`,
          ref: issueItem.id,
          data: {
            issue: issueItem,
            analysisId: analysis?.id,
            summary: analysis?.summary,
            documentType: analysis?.documentType,
            redFlags: analysis?.redFlags,
          },
          contextText: copyText,
        };
        openChat('', context);
      } else {
        const docTitle = analysis?.documentType || title || 'Document Analysis';
        const summary = analysis?.summary || '';
        const contextText = summary ? `${docTitle}\n\n${summary.slice(0, 300)}${summary.length > 300 ? '...' : ''}` : docTitle;
        const context = {
          source: 'details',
          type: 'document',
          title: docTitle,
          ref: analysis?.id || `doc-${(analysis?.documentType || 'doc').replace(/\s+/g, '-').slice(0, 30)}`,
          data: {
            summary,
            documentType: analysis?.documentType,
            redFlags: analysis?.redFlags,
            analysisId: analysis?.id,
          },
          contextText,
        };
        openChat('', context);
      }
      navigation.navigate('Chat');
    },
    [analysis, openChat, navigation, title]
  );

  const handleMenuAction = useCallback(({ nativeEvent }) => {
    if (nativeEvent.event === 'export') {
      exportAnalysisToPdf(analysis).catch((e) =>
        Alert.alert(t('details.exportFailed'), e?.message || t('details.couldNotCreatePdf'))
      );
    }
  }, [analysis]);

  const onJurisdictionEdit = useCallback(() => {
    fromJurisdictionRef.current = true;
    lastJurisdictionRef.current = profile?.jurisdiction_code;
    navigation.navigate('Jurisdiction');
  }, [profile?.jurisdiction_code, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!fromJurisdictionRef.current || !documentText) return;
      fromJurisdictionRef.current = false;
      const newCode = profile?.jurisdiction_code || 'US';
      if (lastJurisdictionRef.current === newCode) return;
      lastJurisdictionRef.current = newCode;
      setReAnalyzing(true);
      analyzeDocument(documentText, { jurisdiction: newCode, language: getAppLanguageCode() })
        .then((result) => setAnalysis({ ...result, text_content: documentText }))
        .catch(() => {})
        .finally(() => setReAnalyzing(false));
    }, [documentText, profile?.jurisdiction_code, setAnalysis])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerLeft: () => (
        <IconButton
          icon={ChevronLeft}
          onPress={() => navigation.goBack()}
          size={36}
          iconSize={22}
        />
      ),
      headerRight: () => (
        <MenuView onPressAction={handleMenuAction} actions={menuActions}>
          <IconButton icon={EllipsisVertical} size={36} iconSize={20} />
        </MenuView>
      ),
    });
  }, [navigation, handleMenuAction, colors]);

  const filteredIssues =
    activeFilter === 'all' ? redFlags : redFlags.filter((item) => item.type === activeFilter);

  if (reAnalyzing) {
    return (
      <View style={styles.container}>
        <SkeletonDetails />
        <View style={localStyles.reAnalyzingWrap}>
          <Text style={localStyles.reAnalyzingText}>
            Re-analyzing for new jurisdiction...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.fixedTop}>
          <View style={styles.summaryCard}>
            <ScoreRing score={score} styles={styles} colors={colors} />
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle}>{title}</Text>
              <View style={styles.summaryBadges}>
                {criticalCount > 0 && (
                  <View style={styles.badgeCritical}>
                    <Text style={styles.badgeCriticalText}>{t('analysis.badgeCritical', { count: criticalCount })}</Text>
                  </View>
                )}
                {warningCount > 0 && (
                  <View style={styles.badgeWarning}>
                    <Text style={styles.badgeWarningText}>{t('analysis.badgeWarnings', { count: warningCount })}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.summaryDate}>Just now</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBarSticky}>
          <DraggableSegmentedControl
            activeIndex={activeTab}
            onIndexChange={setActiveTab}
            labels={tabLabels}
            styles={styles}
          />
          {activeTab === 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
              style={styles.filtersScrollWrap}
            >
              {getRedFlagsFilters(redFlags, t).map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(f.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                    <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                      <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                        {f.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 0 && (
            <View style={styles.scrollContent}>
              <SummaryContent
                analysis={analysis}
                jurisdictionCode={profile?.jurisdiction_code || 'US'}
                onJurisdictionEdit={onJurisdictionEdit}
                hideJurisdiction={false}
                styles={styles}
              />
            </View>
          )}
          {activeTab === 1 && (
            <View style={[styles.scrollContent, styles.cardList]}>
              {filteredIssues.map((item) => (
                <IssueCard key={item.id} item={item} onAskAi={() => handleAskAI(item)} styles={styles} issueTypeConfig={issueTypeConfig} colors={colors} />
              ))}
            </View>
          )}
          {activeTab === 2 && (
            <View style={[styles.scrollContent, styles.cardList]}>
              {guidance.map((item) => (
                <GuidanceCard key={item.id} item={item} showCheckbox={false} styles={styles} severityConfig={severityConfig} colors={colors} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={localStyles.bottomRow}>
        <TouchableOpacity
          style={localStyles.saveButton}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={localStyles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.askRoundButton}
          activeOpacity={0.85}
          onPress={() => handleAskAI()}
          disabled={saving}
        >
          <Image
            source={require('../../assets/ai-lawyer-logo.png')}
            style={localStyles.askRoundLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createLocalStyles(colors) {
  return {
    reAnalyzingWrap: { paddingHorizontal: spacing.md, paddingTop: 8, alignItems: 'center' },
    reAnalyzingText: { fontFamily, fontSize: 16, color: colors.secondaryText },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingTop: 16,
      paddingBottom: spacing.lg,
    },
    saveButton: {
      flex: 1,
      height: 56,
      borderRadius: 100,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      fontFamily,
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
    },
    askRoundButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: 0,
    },
    askRoundLogo: {
      width: 56,
      height: 56,
    },
  };
}
