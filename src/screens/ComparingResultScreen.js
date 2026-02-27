/**
 * AI Lawyer - Comparing Result Screen
 * Displays comparison result from Edge Function: summary, filters, diff cards.
 */

import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, ArrowRight } from 'lucide-react-native';
import { MenuView } from '@react-native-menu/menu';
import { fontFamily, spacing, useTheme } from '../theme';
import { NativeHeaderButtonEllipsis } from '../components/NativeHeaderButton';
import { maybeRequestReview } from '../lib/requestReview';
import { exportComparingResultToPdf } from '../lib/exportPdf';

const SUMMARY_TRUNCATE_LEN = 200;

function getTypeConfig(colors) {
  return {
    removed: { labelKey: 'comparingResult.removed', color: colors.error, bg: colors.accent3 },
    changed: { labelKey: 'comparingResult.changed', color: colors.warning, bg: colors.accent4 },
    added: { labelKey: 'comparingResult.added', color: colors.success, bg: colors.accent2 },
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
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const typeConfig = useMemo(() => getTypeConfig(colors), [colors]);
  const result = route.params?.result || null;
  const document1Name = route.params?.document1Name || '';
  const document2Name = route.params?.document2Name || '';

  const [activeFilter, setActiveFilter] = useState('all');
  const [summaryShowMore, setSummaryShowMore] = useState(false);

  const menuActions = useMemo(
    () => [
      {
        id: 'share',
        title: t('details.share'),
        image: Platform.select({ ios: 'square.and.arrow.up', android: 'ic_menu_share' }),
        imageColor: colors.primaryText,
      },
      {
        id: 'export',
        title: t('details.exportPdf'),
        image: Platform.select({ ios: 'square.and.arrow.down', android: 'ic_menu_save' }),
        imageColor: colors.primaryText,
      },
    ],
    [t, colors.primaryText]
  );

  const menuActionRef = useRef(() => {});
  menuActionRef.current = (eventId) => {
    if (eventId === 'share' || eventId === 'export') {
      const dialogTitle = eventId === 'share' ? t('details.share') : t('details.exportPdf');
      exportComparingResultToPdf(result, {
        document1Name,
        document2Name,
        dialogTitle,
      }).catch((e) =>
        Alert.alert(t('details.exportFailed'), e?.message || t('details.couldNotCreatePdf'))
      );
    }
  };

  const handleMenuAction = ({ nativeEvent }) => {
    menuActionRef.current(nativeEvent.event);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      ...(Platform.OS === 'ios'
        ? {
            unstable_headerRightItems: () => [
              {
                type: 'menu',
                label: t('details.menuOptions'),
                icon: { type: 'sfSymbol', name: 'ellipsis' },
                menu: {
                  title: '',
                  items: [
                    { type: 'action', label: t('details.share'), icon: { type: 'sfSymbol', name: 'square.and.arrow.up' }, onPress: () => menuActionRef.current('share') },
                    { type: 'action', label: t('details.exportPdf'), icon: { type: 'sfSymbol', name: 'square.and.arrow.down' }, onPress: () => menuActionRef.current('export') },
                  ],
                },
              },
            ],
          }
        : {
            headerRight: () => (
              <View style={styles.menuButtonWrap}>
                <MenuView onPressAction={handleMenuAction} actions={menuActions} themeVariant={isDarkMode ? 'dark' : 'light'} style={styles.menuButtonWrap}>
                  <NativeHeaderButtonEllipsis iconSize={24} />
                </MenuView>
              </View>
            ),
            headerRightContainerStyle: { width: 44, height: 44, maxWidth: 44, maxHeight: 44, flexGrow: 0, flexShrink: 0, justifyContent: 'center', alignItems: 'center', paddingRight: 16 },
          }),
    });
  }, [navigation, menuActions, colors, isDarkMode, t]);

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
          {summary ? (() => {
            const needsTruncate = summary.length > SUMMARY_TRUNCATE_LEN;
            const displaySummary = needsTruncate && !summaryShowMore
              ? summary.slice(0, SUMMARY_TRUNCATE_LEN) + '...'
              : summary;
            return (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>{t('analysis.summaryTitle')}</Text>
                <Text style={styles.summaryCardBody}>
                  {displaySummary}
                  {needsTruncate && (
                    <>
                      {' '}
                      <Text style={styles.showMoreLink} onPress={() => setSummaryShowMore(!summaryShowMore)}>
                        {summaryShowMore ? t('analysis.showLess') : t('analysis.showMore')}
                      </Text>
                    </>
                  )}
                </Text>
              </View>
            );
          })() : null}
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
    menuButtonWrap: {
      width: 44,
      height: 44,
      minWidth: 44,
      minHeight: 44,
      maxWidth: 44,
      maxHeight: 44,
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: 'center',
      borderRadius: 22,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    topSection: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.primaryBackground },
    summaryCard: { backgroundColor: colors.secondaryBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary, padding: spacing.md, gap: 12, marginTop: spacing.md, marginBottom: 0 },
    summaryCardTitle: { fontFamily, fontSize: 20, fontWeight: '600', color: colors.primaryText, lineHeight: 24 },
    summaryCardBody: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.secondaryText, lineHeight: 24 },
    showMoreLink: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.primary, lineHeight: 24 },
    docsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 0 },
    docCard: { flex: 1, backgroundColor: colors.secondaryBackground, borderWidth: 1, borderColor: colors.tertiary, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: 'center', gap: 12 },
    docIconWrap: { backgroundColor: colors.secondaryBackground, borderRadius: 10, padding: 8 },
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
    diffList: { gap: 16, paddingHorizontal: spacing.md, paddingTop: 8 },
    emptyText: { fontFamily, fontSize: 15, color: colors.secondaryText, textAlign: 'center', paddingVertical: spacing.xl },
    diffCard: { backgroundColor: colors.secondaryBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary, padding: spacing.md, gap: 8 },
    diffTitle: { fontFamily, fontSize: 20, fontWeight: '600', color: colors.primaryText, lineHeight: 24, marginBottom: 4 },
    diffText: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, lineHeight: 24 },
    diffTextStrike: { textDecorationLine: 'line-through', textDecorationStyle: 'solid' },
    diffTextStrikeGrey: { color: colors.secondaryText },
    diffTextBold: { fontWeight: '500' },
    significance: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.secondaryText, lineHeight: 24, marginTop: 4 },
    diffTags: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    typeBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, height: 32, borderRadius: 8 },
    typeDot: { width: 8, height: 8, borderRadius: 4 },
    typeBadgeText: { fontFamily, fontSize: 14, fontWeight: '500' },
    sectionBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.alternate, paddingHorizontal: 8, height: 32, borderRadius: 8 },
    sectionBadgeText: { fontFamily, fontSize: 14, fontWeight: '500', color: colors.secondaryText, lineHeight: 20 },
  };
}
