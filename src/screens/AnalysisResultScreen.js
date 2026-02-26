/**
 * AI Lawyer - Analysis Result (post-analysis)
 * Before save: Save button only; Jurisdiction visible; Guidance no checkboxes; menu Export only.
 * After save: same as Details — Ask AI Lawyer button, no Jurisdiction, Guidance with checkboxes, full menu.
 */

import React, { useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MenuView } from '@react-native-menu/menu';
import { NativeHeaderButtonEllipsis } from '../components/NativeHeaderButton';
import { fontFamily, spacing, useTheme } from '../theme';
import { SkeletonDetails } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useAnalysis } from '../context/AnalysisContext';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { analyzeDocument } from '../lib/ai';
import { getAppLanguageCode } from '../i18n';
import { saveDocumentWithAnalysis, updateGuidanceItemDone } from '../lib/documents';
import { exportAnalysisToPdf } from '../lib/exportPdf';
import { maybeRequestReview } from '../lib/requestReview';
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
import { Sparkles } from 'lucide-react-native';

export default function AnalysisResultScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors, isDarkMode } = useTheme();
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
  const [activeTab, setActiveTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [reAnalyzing, setReAnalyzing] = useState(false);

  const menuActions = React.useMemo(
    () =>
      isSaved
        ? [
            { id: 'share', title: t('details.share'), image: Platform.select({ ios: 'square.and.arrow.up', android: 'ic_menu_share' }), imageColor: Platform.select({ ios: colors.primaryText, android: colors.primaryText }) },
            { id: 'export', title: t('details.exportPdf'), image: Platform.select({ ios: 'square.and.arrow.down', android: 'ic_menu_save' }), imageColor: Platform.select({ ios: colors.primaryText, android: colors.primaryText }) },
            { id: 'compare', title: t('details.compare'), image: Platform.select({ ios: 'doc.on.doc', android: 'ic_menu_agenda' }), imageColor: Platform.select({ ios: colors.primaryText, android: colors.primaryText }) },
            { id: 'delete', title: t('details.delete'), attributes: { destructive: true }, image: Platform.select({ ios: 'trash', android: 'ic_menu_delete' }), imageColor: Platform.select({ ios: '#ff3b30', android: '#ff3b30' }) },
          ]
        : [
            { id: 'export', title: t('details.exportPdf'), image: Platform.select({ ios: 'square.and.arrow.down', android: 'ic_menu_save' }), imageColor: Platform.select({ ios: colors.primaryText, android: colors.primaryText }) },
          ],
    [t, colors.primaryText, isSaved]
  );
  const lastJurisdictionRef = useRef(profile?.jurisdiction_code);
  const fromJurisdictionRef = useRef(false);
  const analysisRef = useRef(analysis);
  analysisRef.current = analysis;

  useFocusEffect(
    useCallback(() => {
      if (analysis?.score == null) return;
      const t = setTimeout(() => maybeRequestReview(), 1500);
      return () => clearTimeout(t);
    }, [analysis?.score])
  );

  const rawRedFlags = analysis?.redFlags || RED_FLAGS_ITEMS;
  const redFlags = getNormalizedRedFlags(rawRedFlags);
  const guidance = analysis?.guidance || GUIDANCE_ITEMS;
  const rawScore = analysis?.score;
  const score = typeof rawScore === 'number' && !Number.isNaN(rawScore) ? rawScore : 35;
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
      const saved = await saveToSupabase();
      if (saved) {
        setAnalysis(saved);
        setIsSaved(true);
      }
    } catch (e) {
      Alert.alert(t('details.saveFailed'), e?.message || t('details.couldNotSave'));
    } finally {
      setSaving(false);
    }
  }, [user?.id, saveToSupabase, setAnalysis]);

  const handleGuidanceToggle = useCallback(
    async (itemId, isDone) => {
      try {
        await updateGuidanceItemDone(itemId, isDone);
        setAnalysis((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          next.guidance = (next.guidance || []).map((g) => (g.id === itemId ? { ...g, is_done: isDone } : g));
          return next;
        });
      } catch (_) {}
    },
    [setAnalysis]
  );

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
      navigation.navigate(isSaved ? 'AILawyer' : 'Chat');
    },
    [analysis, openChat, navigation, title, isSaved]
  );

  const exportPdfRef = useRef(() => {});
  exportPdfRef.current = () => {
    const currentAnalysis = analysisRef.current;
    exportAnalysisToPdf(currentAnalysis).catch((e) =>
      Alert.alert(t('details.exportFailed'), e?.message || t('details.couldNotCreatePdf'))
    );
  };
  const handleMenuAction = useCallback(
    ({ nativeEvent }) => {
      const eventId = nativeEvent.event;
      if (eventId === 'export' || eventId === 'share') {
        const isShare = eventId === 'share';
        const dialogTitle = isShare ? t('details.share') : t('details.exportPdf');
        exportAnalysisToPdf(analysisRef.current, { dialogTitle }).catch((e) =>
          Alert.alert(t('details.exportFailed'), e?.message || t('details.couldNotCreatePdf'))
        );
        return;
      }
      if (eventId === 'compare') {
        const current = analysisRef.current;
        const docTitle = current?.documentType || current?.title || 'Document';
        const text_content = current?.text_content ?? documentText ?? '';
        navigation.navigate('CompareDocs', { text_content, title: docTitle });
        return;
      }
      if (eventId === 'delete') {
        Alert.alert(t('details.deleteTitle'), t('details.deleteMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('details.deleteConfirm'), style: 'destructive', onPress: () => navigation.goBack() },
        ]);
      }
    },
    [t, navigation, documentText]
  );

  const onJurisdictionEdit = useCallback(() => {
    fromJurisdictionRef.current = true;
    lastJurisdictionRef.current = profile?.jurisdiction_code;
    navigation.navigate('Jurisdiction');
  }, [profile?.jurisdiction_code, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (isSaved) return;
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
    }, [documentText, profile?.jurisdiction_code, setAnalysis, isSaved])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerRight: () => (
        <View style={styles.menuButtonWrap}>
          <MenuView onPressAction={handleMenuAction} actions={menuActions} themeVariant={isDarkMode ? 'dark' : 'light'} style={styles.menuButtonWrap}>
            <NativeHeaderButtonEllipsis iconSize={24} />
          </MenuView>
        </View>
      ),
      headerRightContainerStyle: { width: 44, height: 44, maxWidth: 44, maxHeight: 44, flexGrow: 0, flexShrink: 0 },
    });
  }, [navigation, colors, menuActions, isDarkMode]);

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
                hideJurisdiction={isSaved}
                styles={styles}
              />
            </View>
          )}
          {activeTab === 1 && (
            <View style={[styles.scrollContent, styles.cardList]}>
              {filteredIssues.map((item) => (
                <IssueCard
                  key={item.id}
                  item={item}
                  onAskAi={() => handleAskAI(item)}
                  askAiLabel={isSaved ? t('details.askAi') : undefined}
                  copyTextLabel={isSaved ? t('details.copyText') : undefined}
                  styles={styles}
                  issueTypeConfig={issueTypeConfig}
                  colors={colors}
                />
              ))}
            </View>
          )}
          {activeTab === 2 && (
            <View style={[styles.scrollContent, styles.cardList]}>
              {guidance.map((item) => (
                <GuidanceCard
                  key={item.id}
                  item={item}
                  onToggleDone={isSaved ? handleGuidanceToggle : undefined}
                  showCheckbox={isSaved}
                  styles={styles}
                  severityConfig={severityConfig}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={isSaved ? styles.bottomAction : localStyles.bottomRow}>
        {isSaved ? (
          <TouchableOpacity style={styles.askButton} activeOpacity={0.85} onPress={() => handleAskAI()}>
            <Sparkles size={20} color="#ffffff" strokeWidth={2} />
            <Text style={styles.askButtonText}>{t('common.askAiLawyer')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={localStyles.saveButton}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={localStyles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function createLocalStyles(colors) {
  return {
    reAnalyzingWrap: { paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: spacing.xl, alignItems: 'center' },
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
  };
}
