/**
 * AI Lawyer - Subscription Bottom Sheet
 * Matches Figma: app bar with close (left), illustration, hero, 2 feature cards, plan cards, Continue, footer, handle.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X, Scan, GitCompare, ShieldCheck, MessageCircleQuestion } from 'lucide-react-native';
import { IconAlertTriangleFilled } from '@tabler/icons-react-native';
import Svg, { Circle } from 'react-native-svg';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useGuest } from '../context/GuestContext';
import {
  isRevenueCatAvailable,
  getRevenueCatOfferings,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '../lib/revenueCat';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../lib/legalUrls';

const CLOSE_DELAY_MS = 4000;
const PROGRESS_RING_DIAMETER = 32;
const PROGRESS_RING_STROKE = 4;
const PROGRESS_RING_R = (PROGRESS_RING_DIAMETER - PROGRESS_RING_STROKE) / 2;
const PROGRESS_RING_CX = 20;
const PROGRESS_RING_CY = 20;
const PROGRESS_RING_SVG_SIZE = 40;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_R;

const FEATURE_CARDS = [
  { titleKey: 'featureCard1Title', descKey: 'featureCard1Desc', Icon: Scan },
  { titleKey: 'featureCard2Title', descKey: 'featureCard2Desc', Icon: GitCompare },
  { titleKey: 'featureCard3Title', descKey: 'featureCard3Desc', Icon: ShieldCheck },
  { titleKey: 'featureCard4Title', descKey: 'featureCard4Desc', Icon: MessageCircleQuestion },
];

const FALLBACK_PLANS = [
  { interval: 'monthly', price_cents: 299, currency: 'USD', trial_days: 3, product_id: 'pro_monthly' },
  { interval: 'yearly', price_cents: 2999, currency: 'USD', trial_days: 3, product_id: 'pro_yearly' },
  { interval: 'weekly', price_cents: 499, currency: 'USD', trial_days: 3, product_id: 'pro_weekly' },
];

const OFFER_PRODUCT_ID = 'pro_yearly_offer';

/**
 * Compute save % for yearly plan: how much cheaper vs paying monthly (12×) or weekly (52×).
 * Prefers comparison vs monthly if available, else vs weekly. Returns 0–99 or null.
 */
function computeYearlySavePercent(yearlyCents, list) {
  if (!yearlyCents || !list?.length) return null;
  const monthly = list.find((p) => p.interval === 'monthly');
  const weekly = list.find((p) => p.interval === 'weekly');
  const referenceCents = monthly
    ? 12 * (monthly.price_cents ?? 0)
    : weekly
      ? 52 * (weekly.price_cents ?? 0)
      : 0;
  if (referenceCents <= 0) return null;
  const percent = Math.round((1 - yearlyCents / referenceCents) * 100);
  if (percent <= 0) return null;
  return Math.min(99, percent);
}

function formatPrice(cents, currency = 'USD') {
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

const SCREEN_HEIGHT = Dimensions.get('window').height || 800;
const SCREEN_WIDTH = Dimensions.get('window').width || 400;

function createStyles(colors) {
  return {
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheetColumn: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    sheet: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      paddingBottom: 0,
    },
    appBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.primaryBackground,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    appBarClose: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressRingSvg: { overflow: 'visible' },
    appBarCardWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.sm,
    },
    appBarCard: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 38,
      borderRadius: 20,
      paddingLeft: 14,
      paddingRight: 16,
      backgroundColor: colors.secondaryBackground,
    },
    appBarCardIcon: { marginRight: 8 },
    appBarCardText: {
      fontFamily,
      fontSize: 16,
      fontWeight: '400',
      color: colors.primaryText,
    },
    appBarSpacer: { width: 40 },
    illustrationColumnWrap: {
      flex: 1,
      minHeight: 0,
    },
    illustrationColumnContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    restContent: {
      flexShrink: 0,
      paddingHorizontal: spacing.md,
    },
    illustrationWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    illustration: {
      width: 300,
      height: 160,
    },
    title: {
      fontFamily,
      fontSize: 30,
      fontWeight: '700',
      color: colors.primaryText,
      textAlign: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 22,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    featureCardsRow: {
      marginBottom: spacing.lg,
      marginHorizontal: -spacing.md,
    },
    featureCardsRowContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    featureCard: {
      width: 300,
      height: 72,
      borderRadius: 16,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondaryBackground,
    },
    featureCardIconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.accent1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureCardTextCol: {
      marginLeft: 12,
      gap: 4,
      flex: 1,
      minWidth: 0,
    },
    featureCardTitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: '500',
      color: colors.primaryText,
    },
    featureCardDesc: {
      fontFamily,
      fontSize: 12,
      fontWeight: '400',
      color: colors.secondaryText,
    },
    plansSectionCard: {
      backgroundColor: colors.secondaryBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: 20,
      overflow: 'hidden',
    },
    plans: { gap: 12, marginBottom: spacing.md },
    planCard: {
      height: 82,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondaryBackground,
      borderRadius: borderRadius.xl,
      borderWidth: 1.5,
      borderColor: colors.tertiary,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    planCardSelected: { borderColor: colors.primary, backgroundColor: colors.secondaryBackground },
    planCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planCheckSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    planInfo: { flex: 1, minWidth: 0, gap: 4 },
    planTitle: {
      fontFamily,
      fontSize: 18,
      fontWeight: '700',
      color: colors.primaryText,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    planSubtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
    planPricing: { alignItems: 'flex-end', gap: 2 },
    planPrice: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.primaryText },
    planPricePerWeek: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
    savePill: {
      position: 'absolute',
      top: 16,
      right: spacing.md,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#FFC247',
    },
    savePillText: {
      fontFamily,
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(0, 0, 0, 0.64)',
      letterSpacing: 0.3,
    },
    continueButton: {
      height: 60,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    continueButtonText: {
      fontFamily,
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    footerLinks: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
    },
    footerLink: {
      fontFamily,
      fontSize: 13,
      fontWeight: '400',
      color: colors.secondaryText,
    },
  };
}

export default function SubscriptionBottomSheet({ visible, onClose, offerId = null, offerProductId = null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isGuest } = useGuest();
  const { products, isPro, refreshSubscription, setGuestSubscription } = useSubscription();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);

  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [closeProgress, setCloseProgress] = useState(0);
  const closeProgressRef = useRef(null);
  const sheetTranslateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const plans = useMemo(() => {
    const isLimitedOffer = offerProductId === OFFER_PRODUCT_ID;
    if (isLimitedOffer) {
      const limitedOfferProduct = products?.find((p) => p.product_id === 'pro_yearly_offer');
      const limitedOfferPriceCents = limitedOfferProduct?.price_cents ?? 1499;
      const currency = limitedOfferProduct?.currency ?? 'USD';
      const pricePerWeek = Math.round(limitedOfferPriceCents / 52);
      const refList = products?.filter((p) => p.interval === 'monthly' || p.interval === 'yearly' || p.interval === 'weekly') ?? [];
      return [{
        product_id: OFFER_PRODUCT_ID,
        interval: 'yearly',
        price: formatPrice(limitedOfferPriceCents, currency),
        price_cents: limitedOfferPriceCents,
        currency,
        trial_days: 0,
        pricePerWeek: `(${formatPrice(pricePerWeek, currency)}${t('subscription.perWeek')})`,
        savePercent: computeYearlySavePercent(limitedOfferPriceCents, refList),
      }];
    }
    let list = products?.length
      ? products.filter((p) => p.interval === 'monthly' || p.interval === 'yearly' || p.interval === 'weekly')
      : [];
    list = list.filter((p) => p.product_id !== OFFER_PRODUCT_ID);
    if (!list.length) {
      list = FALLBACK_PLANS.map((p) => ({
        ...p,
        product_id: p.product_id || (p.interval === 'monthly' ? 'pro_monthly' : p.interval === 'weekly' ? 'pro_weekly' : 'pro_yearly'),
      }));
    }
    const mapped = list.map((p) => {
      const baseCents = p.price_cents ?? 0;
      const currency = p.currency ?? 'USD';
      const pricePerWeek = p.interval === 'yearly' ? Math.round(baseCents / 52) : null;
      const savePerc = p.interval === 'yearly' ? computeYearlySavePercent(baseCents, list) : null;
      return {
        product_id: p.product_id || (p.interval === 'monthly' ? 'pro_monthly' : p.interval === 'weekly' ? 'pro_weekly' : 'pro_yearly'),
        interval: p.interval,
        price: formatPrice(baseCents, currency),
        price_cents: baseCents,
        currency,
        trial_days: p.trial_days ?? 0,
        pricePerWeek: pricePerWeek != null ? `(${formatPrice(pricePerWeek, currency)}${t('subscription.perWeek')})` : null,
        savePercent: savePerc,
      };
    });
    return mapped.sort((a, b) => {
      if (a.interval === 'yearly') return -1;
      if (b.interval === 'yearly') return 1;
      if (a.interval === 'weekly') return -1;
      if (b.interval === 'weekly') return 1;
      return 0;
    });
  }, [products, t, offerProductId]);

  const selectedPlan = plans[selectedPlanIndex];

  useEffect(() => {
    if (visible) {
      setSelectedPlanIndex(0);
      setShowCloseButton(false);
      setCloseProgress(0);
      sheetTranslateX.setValue(SCREEN_WIDTH);
      Animated.spring(sheetTranslateX, {
        toValue: 0,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
      }).start();
      const start = Date.now();
      closeProgressRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const p = Math.min(1, elapsed / CLOSE_DELAY_MS);
        setCloseProgress(p);
        if (p >= 1) {
          if (closeProgressRef.current) clearInterval(closeProgressRef.current);
          closeProgressRef.current = null;
          setShowCloseButton(true);
        }
      }, 50);
    } else {
      sheetTranslateX.setValue(SCREEN_WIDTH);
      if (closeProgressRef.current) {
        clearInterval(closeProgressRef.current);
        closeProgressRef.current = null;
      }
    }
    return () => {
      if (closeProgressRef.current) clearInterval(closeProgressRef.current);
    };
  }, [visible, sheetTranslateX]);

  const closeSheet = () => {
    Animated.timing(sheetTranslateX, {
      toValue: SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onClose?.();
    });
  };

  const handleRestore = async () => {
    if (restoring || !isRevenueCatAvailable()) return;
    setRestoring(true);
    try {
      const result = await restoreRevenueCatPurchases();
      if (result.customerInfo) {
        await refreshSubscription();
        const hasPro = result.customerInfo?.entitlements?.active?.['DocTrust Pro'] != null;
        if (hasPro) {
          Alert.alert(t('subscription.youHavePro'), '', [{ text: t('common.done'), onPress: closeSheet }]);
          closeSheet();
        } else {
          Alert.alert(t('subscription.restore'), t('subscription.restoreNoSubscription'));
        }
      } else {
        Alert.alert(t('common.error'), result.error?.message || t('subscription.errorSubscribe'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || t('subscription.errorSubscribe'));
    } finally {
      setRestoring(false);
    }
  };

  const handleContinue = async () => {
    if (isPro) {
      closeSheet();
      return;
    }
    if (!selectedPlan?.product_id) {
      Alert.alert(t('common.error'), t('subscription.errorSelectPlan'));
      return;
    }
    if (!isRevenueCatAvailable()) {
      Alert.alert(t('common.error'), t('subscription.errorSubscribe'));
      return;
    }
    setSubmitting(true);
    try {
      const offerings = await getRevenueCatOfferings();
      const pkg = offerings?.current?.availablePackages?.find(
        (p) => p?.product?.identifier === selectedPlan.product_id
      );
      if (!pkg) {
        Alert.alert(t('common.error'), t('subscription.errorSubscribe'));
        setSubmitting(false);
        return;
      }
      const purchaseResult = await purchaseRevenueCatPackage(pkg);
      if (purchaseResult.customerInfo) {
        await refreshSubscription();
        closeSheet();
        return;
      }
      if (purchaseResult.error?.userCancelled) {
        setSubmitting(false);
        return;
      }
      Alert.alert(
        t('common.error'),
        purchaseResult.error?.message || t('subscription.errorSubscribe')
      );
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || t('subscription.errorSubscribe'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={closeSheet}
    >
      <Pressable style={styles.backdrop} />
      <Animated.View
        style={[styles.sheetColumn, { transform: [{ translateX: sheetTranslateX }] }]}
      >
        <View style={styles.sheet}>
          <View style={[styles.appBar, { paddingTop: Math.max(insets.top, spacing.md) + 8 }]}>
            {showCloseButton ? (
              <TouchableOpacity
                style={styles.appBarClose}
                onPress={closeSheet}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color={colors.primaryText} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : (
              <View style={styles.appBarClose} pointerEvents="none">
                <Svg width={PROGRESS_RING_SVG_SIZE} height={PROGRESS_RING_SVG_SIZE} style={styles.progressRingSvg}>
                  <Circle
                    cx={PROGRESS_RING_CX}
                    cy={PROGRESS_RING_CY}
                    r={PROGRESS_RING_R}
                    stroke={colors.tertiary}
                    strokeWidth={PROGRESS_RING_STROKE}
                    fill="none"
                    strokeDasharray={PROGRESS_CIRCUMFERENCE}
                    strokeDashoffset={PROGRESS_CIRCUMFERENCE * (1 - closeProgress)}
                    transform={`rotate(-90 ${PROGRESS_RING_CX} ${PROGRESS_RING_CY})`}
                  />
                </Svg>
              </View>
            )}
            <View style={styles.appBarCardWrap}>
              <View style={styles.appBarCard}>
                <View style={styles.appBarCardIcon}>
                  <IconAlertTriangleFilled size={20} color={colors.error} />
                </View>
                <Text style={styles.appBarCardText} numberOfLines={1}>
                  {t('subscription.risksFound', { count: 3 })}
                </Text>
              </View>
            </View>
            <View style={styles.appBarSpacer} />
          </View>

          {/* Column with illustration — fills all space between app bar and rest content */}
          <View style={styles.illustrationColumnWrap}>
            <ScrollView
              style={styles.illustrationColumnWrap}
              contentContainerStyle={styles.illustrationColumnContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.illustrationWrap}>
                <Image
                  source={require('../../assets/subscription-illustration.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>
            </ScrollView>
          </View>

          {/* Title, description, row of cards, plans card */}
          <View style={styles.restContent}>
            <Text style={styles.title}>{t('subscription.title')}</Text>
            <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>

            <ScrollView
              horizontal
              style={styles.featureCardsRow}
              contentContainerStyle={styles.featureCardsRowContent}
              showsHorizontalScrollIndicator={false}
            >
              {FEATURE_CARDS.map((item, index) => {
                const Icon = item.Icon;
                return (
                  <View key={index} style={styles.featureCard}>
                    <View style={styles.featureCardIconBox}>
                      <Icon size={24} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.featureCardTextCol}>
                      <Text style={styles.featureCardTitle} numberOfLines={1}>
                        {t(`subscription.${item.titleKey}`)}
                      </Text>
                      <Text style={styles.featureCardDesc} numberOfLines={1}>
                        {t(`subscription.${item.descKey}`)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.plansSectionCard}>
              <View style={styles.plans}>
                {plans.map((plan, index) => {
                  const isSelected = selectedPlanIndex === index;
                  const planLabel =
                    plan.interval === 'monthly'
                      ? t('subscription.monthlyPlan')
                      : plan.interval === 'weekly'
                        ? t('subscription.weeklyPlan')
                        : t('subscription.yearlyPlan');
                  const trialText =
                    plan.trial_days > 0
                      ? t('subscription.trialDays', { count: plan.trial_days })
                      : null;
                  return (
                    <TouchableOpacity
                      key={plan.interval}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected,
                        plan.interval === 'yearly' && plan.savePercent != null && { paddingRight: 80 },
                      ]}
                      onPress={() => setSelectedPlanIndex(index)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.planCheck, isSelected && styles.planCheckSelected]}>
                        {isSelected && (
                          <Check size={14} color={colors.secondaryBackground} strokeWidth={3} />
                        )}
                      </View>
                      <View style={styles.planInfo}>
                        <Text style={styles.planTitle}>{planLabel.toUpperCase()}</Text>
                        {plan.interval === 'yearly' && (
                          <Text style={styles.planSubtitle}>
                            {plan.price}{t('subscription.perYear')} {plan.pricePerWeek}
                          </Text>
                        )}
                        {plan.interval === 'weekly' && (
                          <Text style={styles.planSubtitle}>
                            {trialText ? `${trialText}, ${t('subscription.then')} ` : ''}{plan.price}{t('subscription.perWeek')}
                          </Text>
                        )}
                        {plan.interval === 'monthly' && (
                          <Text style={styles.planSubtitle}>
                            {trialText ? `${trialText}, ${t('subscription.then')} ` : ''}{plan.price}{t('subscription.perMonth')}
                          </Text>
                        )}
                      </View>
                      {plan.savePercent != null && plan.interval === 'yearly' && (
                        <View style={styles.savePill}>
                          <Text style={styles.savePillText}>
                            {t('subscription.savePercent', { percent: plan.savePercent })}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.continueButton, submitting && { opacity: 0.7 }]}
                onPress={handleContinue}
                activeOpacity={0.8}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.continueButtonText}>
                    {isPro
                      ? t('subscription.youHavePro')
                      : t('subscription.continue')}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinks}>
                <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_USE_URL).catch(() => {})}>
                  <Text style={styles.footerLink}>Terms of Use</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRestore} disabled={restoring}>
                  <Text style={[styles.footerLink, restoring && { opacity: 0.6 }]}>
                    {restoring ? t('subscription.restoring') : t('subscription.restore')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
