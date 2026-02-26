/**
 * AI Lawyer - Skeleton placeholder
 * Theme-aware, animated pulse. Use for loading states instead of spinners
 * where layout is known (lists, cards, forms).
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius } from '../theme';

const PULSE_MIN = 0.35;
const PULSE_MAX = 0.75;
const PULSE_DURATION = 1000;

export default function Skeleton({ width, height, borderRadius = 8, style, children }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(PULSE_MIN)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PULSE_MAX,
          duration: PULSE_DURATION,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: PULSE_MIN,
          duration: PULSE_DURATION,
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const baseColor = colors.tertiary || colors.alternate;
  const viewStyle = [
    {
      width: width ?? '100%',
      height: height ?? 20,
      borderRadius,
      backgroundColor: baseColor,
    },
    style,
  ];

  if (children) {
    return (
      <Animated.View style={[viewStyle, { opacity }]}>
        {children}
      </Animated.View>
    );
  }
  return <Animated.View style={[viewStyle, { opacity }]} />;
}

/**
 * Preset: skeleton for a list card (left circle + right lines) — e.g. History
 */
export function SkeletonCard({ style, circleSize = 56, lineWidths = ['80%', '60%', '40%'] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.secondaryBackground, borderColor: colors.tertiary }, style]}>
      <Skeleton width={circleSize} height={circleSize} borderRadius={circleSize / 2} />
      <View style={styles.cardContent}>
        {lineWidths.map((w, i) => (
          <Skeleton key={i} height={i === 0 ? 16 : 12} width={w} style={i === 0 ? styles.cardTitle : styles.cardLine} />
        ))}
      </View>
    </View>
  );
}

/**
 * Preset: skeleton for feature request / idea card (title + desc + date, right block)
 */
export function SkeletonFeatureCard({ style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.featureCard, { backgroundColor: colors.secondaryBackground, borderColor: colors.tertiary }, style]}>
      <View style={styles.featureCardContent}>
        <Skeleton height={16} width="70%" style={styles.featureTitle} />
        <Skeleton height={14} width="100%" style={styles.featureLine} />
        <Skeleton height={14} width="90%" style={styles.featureLine} />
        <Skeleton height={12} width="35%" style={styles.featureDate} />
      </View>
      <Skeleton width={48} height={52} borderRadius={12} />
    </View>
  );
}

/**
 * Preset: skeleton for form (avatar + label + input rows)
 */
export function SkeletonForm({ avatarSize = 100, fieldCount = 3 }) {
  const { colors } = useTheme();
  return (
    <View style={styles.form}>
      <View style={styles.formAvatarWrap}>
        <Skeleton width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} />
      </View>
      {Array.from({ length: fieldCount }).map((_, i) => (
        <View key={i} style={styles.formField}>
          <Skeleton height={14} width={80} style={styles.formLabel} />
          <Skeleton height={56} width="100%" borderRadius={20} />
        </View>
      ))}
    </View>
  );
}

/**
 * Preset: skeleton for Details (summary card + tab bar + content lines)
 */
export function SkeletonDetails() {
  const { colors } = useTheme();
  return (
    <View style={[styles.details, { backgroundColor: colors.primaryBackground }]}>
      <View style={[styles.detailsSummary, { backgroundColor: colors.secondaryBackground, borderColor: colors.tertiary }]}>
        <Skeleton width={72} height={72} borderRadius={36} />
        <View style={styles.detailsSummaryRight}>
          <Skeleton height={18} width="60%" style={styles.detailsTitle} />
          <View style={styles.detailsBadges}>
            <Skeleton height={24} width={70} borderRadius={12} />
            <Skeleton height={24} width={80} borderRadius={12} style={{ marginLeft: 8 }} />
          </View>
          <Skeleton height={12} width={90} style={styles.detailsDate} />
        </View>
      </View>
      <View style={styles.detailsTabs}>
        <Skeleton height={40} width="30%" borderRadius={20} />
        <Skeleton height={40} width="30%" borderRadius={20} />
        <Skeleton height={40} width="28%" borderRadius={20} />
      </View>
      <View style={styles.detailsContent}>
        {[1, 0.9, 0.7, 0.85].map((w, i) => (
          <Skeleton key={i} height={14} width={`${w * 100}%`} style={styles.detailsLine} />
        ))}
      </View>
    </View>
  );
}

/**
 * Preset: Limited Offer banner — form and layout match (rounded rect, left: title + subtitle + countdown boxes; right: image area).
 * Colors: dimmed blue container to match banner, skeleton pulse on placeholders.
 */
export function SkeletonOfferBanner({ style }) {
  const { colors } = useTheme();
  const containerBg = colors.primary ? `${colors.primary}2a` : 'rgba(59,130,246,0.18)'; // hex alpha ~17%
  return (
    <View style={[offerBannerStyles.container, { backgroundColor: containerBg }, style]}>
      <View style={offerBannerStyles.left}>
        <Skeleton height={20} width={140} borderRadius={6} style={offerBannerStyles.title} />
        <Skeleton height={16} width={80} borderRadius={6} style={offerBannerStyles.subtitle} />
        <View style={offerBannerStyles.countdownRow}>
          <Skeleton height={32} width={40} borderRadius={8} />
          <View style={offerBannerStyles.colon} />
          <Skeleton height={32} width={40} borderRadius={8} />
          <View style={offerBannerStyles.colon} />
          <Skeleton height={32} width={40} borderRadius={8} />
        </View>
      </View>
      <Skeleton width={120} height={120} borderRadius={12} style={offerBannerStyles.image} />
    </View>
  );
}

/**
 * Preset: AI Lawyer chat list card — same form as chatCard (title, date, 2-line preview, icon space).
 */
export function SkeletonChatCard({ style }) {
  const { colors } = useTheme();
  const cardStyle = {
    width: '100%',
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tertiary,
    paddingLeft: 16,
    paddingTop: 18,
    paddingRight: 14,
    paddingBottom: 18,
    marginBottom: spacing.sm,
  };
  return (
    <View style={[cardStyle, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Skeleton height={18} width="65%" borderRadius={6} />
          <Skeleton height={14} width="45%" borderRadius={6} style={{ marginTop: 10 }} />
          <Skeleton height={16} width="100%" borderRadius={6} style={{ marginTop: 10 }} />
          <Skeleton height={16} width="88%" borderRadius={6} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={24} height={24} borderRadius={4} style={{ marginTop: 2 }} />
      </View>
    </View>
  );
}

/**
 * Preset: app boot / auth restore (logo + 2 lines)
 */
export function SkeletonAppBoot({ logoSize = 80 }) {
  return (
    <View style={bootStyles.wrap}>
      <Skeleton width={logoSize} height={logoSize} borderRadius={logoSize / 2} />
      <Skeleton height={14} width={160} style={bootStyles.line1} />
      <Skeleton height={12} width={120} style={bootStyles.line2} />
    </View>
  );
}

const bootStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  line1: {},
  line2: {},
});

const offerBannerStyles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 140,
  },
  left: { flex: 1, gap: spacing.xxs },
  title: { marginBottom: 2 },
  subtitle: { marginBottom: spacing.md },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colon: { width: 16, marginHorizontal: 2 },
  image: { marginLeft: spacing.sm },
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 16,
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { marginBottom: 8 },
  cardLine: { marginTop: 6 },
  featureCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  featureCardContent: { flex: 1 },
  featureTitle: { marginBottom: 8 },
  featureLine: { marginTop: 6 },
  featureDate: { marginTop: 10 },
  form: { paddingHorizontal: 16 },
  formAvatarWrap: { alignItems: 'center', paddingTop: 24, paddingBottom: 24 },
  formField: { marginBottom: 20 },
  formLabel: { marginBottom: 14 },
  details: { flex: 1, paddingTop: 12 },
  detailsSummary: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    gap: 16,
    alignItems: 'center',
  },
  detailsSummaryRight: { flex: 1 },
  detailsTitle: { marginBottom: 8 },
  detailsBadges: { flexDirection: 'row', marginBottom: 6 },
  detailsDate: {},
  detailsTabs: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  detailsContent: { paddingHorizontal: 16, gap: 10 },
  detailsLine: {},
});
