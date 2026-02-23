/**
 * AI Lawyer - Comparing Result Screen
 * Displays comparison result from Edge Function: summary, filters, diff cards.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { FileText, ArrowRight } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import { NativeHeaderButtonBack } from '../components/NativeHeaderButton';
import { maybeRequestReview } from '../lib/requestReview';

function getTypeConfig(colors) {
  return {
    removed: { labelKey: 'comparingResult.removed', color: colors.error, bg: '#fef2f2' },
    changed: { labelKey: 'comparingResult.changed', color: colors.warning, bg: '#fffbeb' },
    added: { labelKey: 'comparingResult.added', color: colors.success, bg: '#f1fbeb' },
  };
}

function DiffCard({ item, config, t, styles }) {
  const showStrikethrough = item.type === 'removed' || item.type === 'changed';
  const oldText = item.document1 ?? item.oldText ?? null;
  const newText = item.document2 ?? item.newText ?? null;

  return (
    <View style={styles.diffCard}>
      {item.title ? (
        <Text style={styles.diffTitle}>{item.title}</Text>
      ) : null}
      {showStrikethrough && oldText ? (
        <Text
          style={[
            styles.diffText,
            styles.diffTextStrike,
            item.type === 'changed' && styles.diffTextStrikeGrey,
          ]}
        >
          {oldText}
        </Text>
      ) : null}
      {newText ? (
        <Text style={[styles.diffText, item.type === 'added' && styles.diffTextBold]}>
          {newText}
        </Text>
      ) : null}
      {item.significance ? (
        <Text style={styles.significance}>{item.significance}</Text>
      ) : null}
      <View style={styles.diffTags}>
        <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
          <View style={[styles.typeDot, { backgroundColor: config.color }]} />
          <Text style={[styles.typeBadgeText, { color: config.color }]}>{t(config.labelKey)}</Text>
        </View>
        {item.section ? (
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{item.section}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function ComparingResultScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const typeConfig = useMemo(() => getTypeConfig(colors), [colors]);
  const result = route.params?.result || null;
  const document1Name = route.params?.document1Name || '';
  const document2Name = route.params?.document2Name || '';

  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => maybeRequestReview(), 1500);
    return () => clearTimeout(t);
  }, [result]);

  const differences = useMemo(() => {
    if (!result?.differences || !Array.isArray(result.differences)) return [];
    return result.differences.map((d, i) => ({
      ...d,
      id: d.id || `diff-${i}`,
      type: d.type === 'added' || d.type === 'removed' || d.type === 'changed' ? d.type : 'changed',
    }));
  }, [result]);

  const filterCounts = useMemo(() => {
    const all = differences.length;
    const added = differences.filter((d) => d.type === 'added').length;
    const removed = differences.filter((d) => d.type === 'removed').length;
    const changed = differences.filter((d) => d.type === 'changed').length;
    return [
      { id: 'all', labelKey: 'comparingResult.all', count: all },
      { id: 'changed', labelKey: 'comparingResult.changed', count: changed },
      { id: 'added', labelKey: 'comparingResult.added', count: added },
      { id: 'removed', labelKey: 'comparingResult.removed', count: removed },
    ];
  }, [differences]);

  const filtered =
    activeFilter === 'all'
      ? differences
      : differences.filter((d) => d.type === activeFilter);

  React.useEffect(() => {
    if (!result) {
      navigation.replace('CompareDocs');
    }
  }, [result, navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerLeft: () => (
        <NativeHeaderButtonBack
          onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }))}
        />
      ),
    });
  }, [navigation, colors]);

  if (!result) return null;

  const summary = result.summary || '';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.topSection}>
          {summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          ) : null}
          <View style={styles.docsRow}>
            <View style={styles.docCard}>
              <View style={styles.docIconWrap}>
                <FileText size={20} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={styles.docName} numberOfLines={2}>
                {document1Name || t('comparingResult.original')}
              </Text>
            </View>
            <ArrowRight size={24} color={colors.secondaryText} strokeWidth={2} />
            <View style={styles.docCard}>
              <View style={styles.docIconWrap}>
                <FileText size={20} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={styles.docName} numberOfLines={2}>
                {document2Name || t('comparingResult.revised')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.filtersSticky}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
            style={styles.filtersScroll}
          >
            {filterCounts.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {t(f.labelKey)}
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
        </View>

        <View style={styles.diffList}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>{t('comparingResult.noDifferences')}</Text>
          ) : (
            filtered.map((item) => (
              <DiffCard
                key={item.id}
                item={item}
                config={typeConfig[item.type] || typeConfig.changed}
                t={t}
                styles={styles}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    topSection: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.primaryBackground },
    summaryCard: { backgroundColor: colors.secondaryBackground, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.tertiary },
    summaryText: { fontFamily, fontSize: 15, fontWeight: '400', color: colors.primaryText, lineHeight: 22 },
    docsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    docCard: { flex: 1, backgroundColor: colors.accent1, borderWidth: 1, borderColor: colors.tertiary, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: 'center', gap: 12 },
    docIconWrap: { backgroundColor: colors.accent1, borderRadius: 10, padding: 8 },
    docName: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.primaryText, textAlign: 'center', lineHeight: 20 },
    filtersSticky: { backgroundColor: colors.primaryBackground, paddingBottom: 12 },
    filtersScroll: {},
    filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
    filterChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, backgroundColor: colors.tertiary, borderRadius: 32, paddingLeft: 12, paddingRight: 10, gap: 6 },
    filterChipActive: { backgroundColor: colors.primary },
    filterChipText: { fontFamily, fontSize: 14, fontWeight: '500', color: colors.secondaryText },
    filterChipTextActive: { color: '#ffffff' },
    filterCount: { width: 20, height: 20, borderRadius: 100, backgroundColor: colors.alternate, alignItems: 'center', justifyContent: 'center' },
    filterCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
    filterCountText: { fontFamily, fontSize: 12, fontWeight: '500', color: colors.secondaryText },
    filterCountTextActive: { color: '#ffffff' },
    scroll: { flex: 1, minHeight: 0 },
    scrollContent: { paddingBottom: spacing.xxl },
    diffList: { gap: 8, paddingHorizontal: spacing.md, paddingTop: 8 },
    emptyText: { fontFamily, fontSize: 15, color: colors.secondaryText, textAlign: 'center', paddingVertical: spacing.xl },
    diffCard: { backgroundColor: colors.secondaryBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary, padding: spacing.md, gap: 8 },
    diffTitle: { fontFamily, fontSize: 15, fontWeight: '600', color: colors.primaryText, marginBottom: 4 },
    diffText: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, lineHeight: 24 },
    diffTextStrike: { textDecorationLine: 'line-through', textDecorationStyle: 'solid' },
    diffTextStrikeGrey: { color: colors.secondaryText },
    diffTextBold: { fontWeight: '500' },
    significance: { fontFamily, fontSize: 13, fontWeight: '400', color: colors.secondaryText, fontStyle: 'italic', marginTop: 4 },
    diffTags: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
    typeDot: { width: 8, height: 8, borderRadius: 4 },
    typeBadgeText: { fontFamily, fontSize: 12, fontWeight: '500' },
    sectionBadge: { backgroundColor: colors.primaryBackground, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
    sectionBadgeText: { fontFamily, fontSize: 12, fontWeight: '500', color: colors.secondaryText },
  };
}
