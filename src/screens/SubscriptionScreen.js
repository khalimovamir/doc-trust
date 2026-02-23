/**
 * AI Lawyer - Subscription Screen
 * Design from Figma: Premium subscription (Monthly/Yearly).
 * From Supabase: only prices (price_cents, currency) and trial_days per product.
 * All other texts from i18n.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, Check } from 'lucide-react-native';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { useSubscription } from '../context/SubscriptionContext';
import { applyOfferDiscount } from '../lib/subscription';

function formatPrice(cents, currency = 'USD') {
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

const FEATURE_KEYS = [
  { titleKey: 'subscription.feature1Title', descKey: 'subscription.feature1Desc' },
  { titleKey: 'subscription.feature2Title', descKey: 'subscription.feature2Desc' },
  { titleKey: 'subscription.feature3Title', descKey: 'subscription.feature3Desc' },
  { titleKey: 'subscription.feature4Title', descKey: 'subscription.feature4Desc' },
];

const FALLBACK_PLANS = [
  { interval: 'monthly', price_cents: 299, currency: 'USD', trial_days: 3 },
  { interval: 'yearly', price_cents: 2999, currency: 'USD', trial_days: 3 },
];

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
    hero: { marginTop: 12, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    title: { fontFamily, fontSize: 32, fontWeight: '600', color: colors.primaryText, marginBottom: spacing.xs },
    subtitle: { fontFamily, fontSize: 16, fontWeight: '400', lineHeight: 22, color: colors.primaryText },
    features: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md, justifyContent: 'center' },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    featureIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent2, alignItems: 'center', justifyContent: 'center' },
    featureText: { flex: 1, gap: 4 },
    featureTitle: { fontFamily, fontSize: 16, fontWeight: '600', color: colors.primaryText },
    featureSubtitle: { fontFamily, fontSize: 14, fontWeight: '400', lineHeight: 20, color: colors.secondaryText },
    plans: { paddingHorizontal: spacing.md, gap: 10 },
    planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondaryBackground, borderRadius: 20, borderWidth: 1.5, borderColor: colors.tertiary, paddingVertical: 14, paddingHorizontal: spacing.md, gap: spacing.sm },
    planCardSelected: { borderColor: colors.primary },
    planCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.tertiary, alignItems: 'center', justifyContent: 'center' },
    planCheckSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    planInfo: { flex: 1, gap: 4 },
    planTitle: { fontFamily, fontSize: 20, fontWeight: '600', color: colors.primaryText },
    planSubtitle: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.secondaryText },
    planPricing: { alignItems: 'flex-end', gap: 4 },
    planPrice: { fontFamily, fontSize: 20, fontWeight: '700', color: colors.primaryText },
    planPriceOld: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
    planPricePerMonth: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.secondaryText },
    offerDiscountText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.primary, marginHorizontal: 16, marginBottom: 16 },
    footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
    noPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    noPaymentText: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.secondaryText },
    subscribeButton: { height: 56, backgroundColor: colors.primary, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    subscribeButtonText: { fontFamily, fontSize: 16, fontWeight: '600', color: '#ffffff' },
    footerLinks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
    footerLink: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
  };
}

export default function SubscriptionScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const { products, isPro, offers } = useSubscription();

  const fromOffer = route.params?.fromOffer === true && route.params?.offerId;
  const activeOffer = useMemo(() => {
    if (!fromOffer || !offers?.length) return null;
    const id = route.params?.offerId;
    const found = offers.find((o) => String(o.id) === String(id));
    return found ?? offers[0];
  }, [fromOffer, offers, route.params?.offerId]);

  const plans = useMemo(() => {
    const list = products?.length ? products.filter((p) => p.interval === 'monthly' || p.interval === 'yearly') : FALLBACK_PLANS;
    return list.map((p) => {
      const baseCents = p.price_cents ?? 0;
      const discountedCents = activeOffer ? applyOfferDiscount(baseCents, activeOffer) : baseCents;
      const showOriginalPrice = !!activeOffer;
      return {
        interval: p.interval,
        price: formatPrice(discountedCents, p.currency),
        priceOriginal: showOriginalPrice ? formatPrice(baseCents, p.currency) : null,
        price_cents: discountedCents,
        currency: p.currency,
        trial_days: p.trial_days ?? 0,
        pricePerMonth: p.interval === 'yearly' ? `${formatPrice(Math.round(discountedCents / 12), p.currency)}${t('subscription.perMonth')}` : null,
      };
    });
  }, [products, t, activeOffer]);


  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedPlan = plans[selectedIndex];

  const handleBack = () => navigation.goBack();
  const handleSubscribe = () => {
    // TODO: handle subscription
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerLeft: () => (
        <IconButton icon={ChevronLeft} onPress={handleBack} size={36} iconSize={22} />
      ),
    });
  }, [navigation, colors]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.title}>{t('subscription.title')}</Text>
          <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>
        </View>

        <View style={styles.features}>
          {FEATURE_KEYS.map((keys, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Check size={24} color={colors.success} strokeWidth={2.5} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{t(keys.titleKey)}</Text>
                <Text style={styles.featureSubtitle}>{t(keys.descKey)}</Text>
              </View>
            </View>
          ))}
        </View>

        {activeOffer && (
          <Text style={styles.offerDiscountText}>
            {t('subscription.youGotDiscount', { discount: activeOffer.subtitle || '50%' })}
          </Text>
        )}
        <View style={styles.plans}>
          {plans.map((plan, index) => {
            const isSelected = selectedIndex === index;
            const planTitle = plan.interval === 'monthly' ? t('subscription.monthly') : t('subscription.yearly');
            const trialText = plan.trial_days > 0 ? t('subscription.trialDays', { count: plan.trial_days }) : null;
            return (
              <TouchableOpacity
                key={plan.interval}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelectedIndex(index)}
                activeOpacity={0.8}
              >
                <View style={[styles.planCheck, isSelected && styles.planCheckSelected]}>
                  {isSelected && <Check size={18} color={colors.secondaryBackground} strokeWidth={3} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>{planTitle}</Text>
                  {trialText && <Text style={styles.planSubtitle}>{trialText}</Text>}
                </View>
                <View style={styles.planPricing}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    {plan.priceOriginal != null && (
                      <Text style={styles.planPriceOld}> / {plan.priceOriginal}</Text>
                    )}
                  </View>
                  {plan.pricePerMonth && (
                    <Text style={styles.planPricePerMonth}>{plan.pricePerMonth}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.noPaymentRow}>
          <Check size={22} color={colors.secondaryText} strokeWidth={2} />
          <Text style={styles.noPaymentText}>{t('subscription.noPaymentDueNow')}</Text>
        </View>
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          activeOpacity={0.8}
        >
          <Text style={styles.subscribeButtonText}>
            {isPro
              ? t('subscription.youHavePro')
              : selectedPlan?.trial_days
                ? t('subscription.tryForDays', { count: selectedPlan.trial_days })
                : t('subscription.subscribe')}
          </Text>
        </TouchableOpacity>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => {}}><Text style={styles.footerLink}>{t('subscription.termsOfUse')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => {}}><Text style={styles.footerLink}>{t('subscription.restore')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => {}}><Text style={styles.footerLink}>{t('subscription.privacyPolicy')}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

