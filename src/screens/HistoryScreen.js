/**
 * AI Lawyer - History Screen
 * App bar, filter chips (All Docs, High Risk, Medium Risk, Low Risk), document list
 * Design from Figma
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getAnalysesForUserWithCache } from '../lib/documents';
import { formatDateShort } from '../lib/dateFormat';
import { FileText } from 'lucide-react-native';
import { ScoreRing, detailsCreateStyles } from './DetailsScreen';
import { SkeletonScanOrHistoryCard } from '../components/Skeleton';

const FILTER_IDS = [
  { id: 'all', labelKey: 'history.filterAll' },
  { id: 'high', labelKey: 'history.filterHighRisk' },
  { id: 'medium', labelKey: 'history.filterMediumRisk' },
  { id: 'low', labelKey: 'history.filterLowRisk' },
];

function getRiskLabelKey(score) {
  const s = Number(score);
  if (Number.isNaN(s)) return 'home.lowRisk';
  if (s < 50) return 'home.highRisk';
  if (s < 70) return 'home.mediumRisk';
  return 'home.lowRisk';
}

function HistoryEmpty({ styles, colors, t }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCard}>
        <FileText size={28} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
      <Text style={styles.emptyDescription}>{t('history.emptyDescription')}</Text>
    </View>
  );
}

function HistoryCard({ item, onPress, cardStyles, scoreRingStyles, colors }) {
  const s = cardStyles || {};
  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={s.cardLeft}>
        <ScoreRing score={item.score ?? 0} size={56} styles={scoreRingStyles} colors={colors} />
      </View>
      <View style={s.cardContent}>
        <Text style={s.cardTitle}>{item.title}</Text>
        <View style={s.cardTags}>
          {(item.tags || []).map((tag, i) => (
            <View key={i} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={s.cardDate}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const scoreRingStyles = useMemo(() => StyleSheet.create(detailsCreateStyles(colors)), [colors]);
  const filters = FILTER_IDS.map((f) => ({ ...f, label: t(f.labelKey) }));

  const fetchItems = useCallback(() => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getAnalysesForUserWithCache(user.id)
      .then((data) => {
        setItems(
          data.map((a) => {
            const tags = [a.documentType || t('home.document')];
            if (a.risksCount > 0) tags.push(`${a.risksCount} ${t('home.risks')}`);
            if (a.tipsCount > 0) tags.push(`${a.tipsCount} ${t('home.tips')}`);
            tags.push(t(getRiskLabelKey(a.score)));
            return {
              id: a.id,
              title: a.documentType || t('home.document'),
              tags,
              date: formatDateShort(a.createdAt),
              score: a.score ?? 0,
            };
          })
        );
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user?.id, t]);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const handleCardPress = (item) => {
    navigation.navigate('Details', { analysisId: item.id });
  };

  const filtered =
    activeFilter === 'all'
      ? items
      : activeFilter === 'high'
        ? items.filter((i) => i.score < 50)
        : activeFilter === 'medium'
          ? items.filter((i) => i.score >= 50 && i.score < 70)
          : items.filter((i) => i.score >= 70);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.appBar}>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
      </View>

      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, activeFilter === f.id && styles.chipActive]}
              onPress={() => setActiveFilter(f.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, activeFilter === f.id && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          !loading && filtered.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.list}>
            {[1, 2, 3, 4, 5].map((key) => (
              <SkeletonScanOrHistoryCard key={key} style={styles.skeletonCard} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <HistoryEmpty styles={styles} colors={colors} t={t} />
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => (
              <HistoryCard key={item.id} item={item} onPress={handleCardPress} cardStyles={styles} scoreRingStyles={scoreRingStyles} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    appBar: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.primaryBackground,
    },
    headerTitle: { fontFamily, fontSize: 24, fontWeight: Platform.OS === 'android' ? '800' : '700', color: colors.primaryText },
    scroll: { flex: 1 },
    filtersSection: {
      paddingTop: 12,
      paddingBottom: spacing.xs,
      backgroundColor: colors.primaryBackground,
    },
    filtersScroll: {},
    loadingWrap: { paddingVertical: 48, alignItems: 'center' },
    filtersRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: Platform.OS === 'android' ? 100 + 24 : 100,
    },
    skeletonCard: {
      marginBottom: spacing.sm,
    },
    chip: {
      height: 42,
      paddingHorizontal: spacing.md,
      borderRadius: 21,
      backgroundColor: colors.secondaryBackground,
      borderWidth: 1,
      borderColor: colors.tertiary,
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontFamily, fontSize: 14, fontWeight: '600', color: colors.primaryText },
    chipTextActive: { color: colors.secondaryBackground },
    scrollContentEmpty: { flexGrow: 1 },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
    emptyIconCard: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.secondaryBackground,
      borderWidth: 1,
      borderColor: colors.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: { fontFamily, fontSize: 20, fontWeight: '600', color: colors.primaryText, textAlign: 'center', marginBottom: spacing.sm },
    emptyDescription: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', lineHeight: 24 },
    list: {},
    card: {
      flexDirection: 'row',
      backgroundColor: colors.secondaryBackground,
      borderRadius: 20,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.tertiary,
    },
    cardLeft: { marginRight: spacing.md },
    cardContent: { flex: 1 },
    cardTitle: {
      fontFamily,
      fontSize: 16,
      fontWeight: Platform.OS === 'android' ? '600' : '500',
      color: colors.primaryText,
      marginBottom: spacing.xs,
    },
    cardTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    tag: {
      backgroundColor: colors.alternate,
      borderRadius: borderRadius.md,
      paddingVertical: 6,
      paddingHorizontal: 8,
      height: 28,
      justifyContent: 'center',
    },
    tagText: { fontFamily, fontSize: 12, fontWeight: '500', color: colors.secondaryText },
    cardDate: { fontFamily, fontSize: 12, fontWeight: '400', color: colors.secondaryText },
  };
}
