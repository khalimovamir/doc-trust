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
  PanResponder,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X, FileStack, MessageCircleQuestion } from 'lucide-react-native';
import { IconAlertTriangleFilled } from '@tabler/icons-react-native';
import Svg, { Circle } from 'react-native-svg';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useGuest } from '../context/GuestContext';
import { grantManualSubscription } from '../lib/subscription';

const CLOSE_DELAY_MS = 4000;
const PROGRESS_RING_DIAMETER = 32;
const PROGRESS_RING_STROKE = 4;
const PROGRESS_RING_R = (PROGRESS_RING_DIAMETER - PROGRESS_RING_STROKE) / 2;
const PROGRESS_RING_CX = 20;
const PROGRESS_RING_CY = 20;
const PROGRESS_RING_SVG_SIZE = 40;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_R;

const FEATURE_CARDS = [
  { title: 'Multiple document analysis', description: 'Ask anything, anytime', Icon: FileStack },
  { title: 'Unlimited Legal Questions', description: 'Ask anything, anytime', Icon: MessageCircleQuestion },
];

const FALLBACK_PLANS = [
  { interval: 'monthly', price_cents: 299, currency: 'USD', trial_days: 3, product_id: 'pro_monthly' },
  { interval: 'yearly', price_cents: 2999, currency: 'USD', trial_days: 3, product_id: 'pro_yearly' },
  { interval: 'weekly', price_cents: 499, currency: 'USD', trial_days: 3, product_id: 'pro_weekly' },
];

const OFFER_PRODUCT_ID = 'pro_yearly_offer';

function formatPrice(cents, currency = 'USD') {
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

const SCREEN_HEIGHT = Dimensions.get('window').height || 800;

function createStyles(colors) {
  return {
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheetColumn: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
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
      fontSize: 32,
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
      marginLeft: 16,
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
      fontSize: 20,
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
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [closeProgress, setCloseProgress] = useState(0);
  const closeProgressRef = useRef(null);
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const plans = useMemo(() => {
    const isLimitedOffer = offerProductId === OFFER_PRODUCT_ID;
    if (isLimitedOffer) {
      const limitedOfferProduct = products?.find((p) => p.product_id === 'pro_yearly_offer');
      const limitedOfferPriceCents = limitedOfferProduct?.price_cents ?? 1499;
      const currency = limitedOfferProduct?.currency ?? 'USD';
      const pricePerWeek = Math.round(limitedOfferPriceCents / 52);
      return [{
        product_id: OFFER_PRODUCT_ID,
        interval: 'yearly',
        price: formatPrice(limitedOfferPriceCents, currency),
        price_cents: limitedOfferPriceCents,
        currency,
        trial_days: 0,
        pricePerWeek: `(${formatPrice(pricePerWeek, currency)}${t('subscription.perWeek')})`,
        savePercent: 40,
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
      const savePerc = p.interval === 'yearly' ? 40 : null;
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
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      Animated.spring(sheetTranslateY, {
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
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      if (closeProgressRef.current) {
        clearInterval(closeProgressRef.current);
        closeProgressRef.current = null;
      }
    }
    return () => {
      if (closeProgressRef.current) clearInterval(closeProgressRef.current);
    };
  }, [visible, sheetTranslateY]);

  const closeSheet = () => {
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onClose?.();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        const dy = gesture.dy;
        const dx = gesture.dx;
        return dy > 8 && Math.abs(dy) > Math.abs(dx);
      },
      onPanResponderMove: (_, gesture) => {
        const y = gesture.dy;
        const val = y >= 0 ? y : Math.max(-40, y);
        sheetTranslateY.setValue(val);
      },
      onPanResponderRelease: (_, gesture) => {
        const dy = gesture.dy;
        const vy = gesture.vy;
        if (dy > 100 || vy > 0.6) {
          closeSheet();
          return;
        }
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: false,
          tension: 80,
          friction: 12,
        }).start();
      },
    })
  ).current;

  const handleContinue = async () => {
    if (isPro) {
      closeSheet();
      return;
    }
    if (isGuest && !user?.id) {
      if (!selectedPlan?.product_id) {
        Alert.alert(t('common.error'), t('subscription.errorSelectPlan'));
        return;
      }
      setSubmitting(true);
      try {
        setGuestSubscription({ tier: 'pro', status: 'active', product_id: selectedPlan.product_id, offer_id: offerId });
        await refreshSubscription();
        closeSheet();
      } catch (e) {
        Alert.alert(t('common.error'), e?.message || t('subscription.errorSubscribe'));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!user?.id || !selectedPlan?.product_id) {
      Alert.alert(t('common.error'), t('subscription.errorSelectPlan'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await grantManualSubscription(user.id, selectedPlan.product_id, offerId);
      if (result?.ok) {
        await refreshSubscription();
        closeSheet();
      } else {
        Alert.alert(t('common.error'), result?.error || t('subscription.errorSubscribe'));
      }
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
      <Pressable style={styles.backdrop} onPress={closeSheet} />
      <Animated.View
        style={[styles.sheetColumn, { transform: [{ translateY: sheetTranslateY }] }]}
        {...panResponder.panHandlers}
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
                        {item.title}
                      </Text>
                      <Text style={styles.featureCardDesc} numberOfLines={1}>
                        {item.description}
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
                            {plan.price}/year {plan.pricePerWeek}
                          </Text>
                        )}
                        {plan.interval === 'weekly' && (
                          <Text style={styles.planSubtitle}>
                            {trialText ? `${trialText}, then ` : ''}{plan.price}{t('subscription.perWeek')}
                          </Text>
                        )}
                        {plan.interval === 'monthly' && (
                          <Text style={styles.planSubtitle}>
                            {trialText ? `${trialText}, then ` : ''}{plan.price}{t('subscription.perMonth')}
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
                      : 'CONTINUE'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinks}>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.footerLink}>Terms of Use</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.footerLink}>{t('subscription.restore')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {}}>
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
