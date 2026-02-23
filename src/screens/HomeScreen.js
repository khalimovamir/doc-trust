/**
 * AI Lawyer - Home Screen
 * Main screen: Scan, Upload, Compare, Paste text, Limited Offer, Recent Scans
 * Design from Figma
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  CloudUpload,
  Files,
  ArrowRight,
  X,
} from 'lucide-react-native';
import {
  IconRosetteDiscountCheckFilled,
  IconCircleXFilled,
} from '@tabler/icons-react-native';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import { useAILawyerTab } from '../context/AILawyerTabContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { dismissUserOffer } from '../lib/subscription';
import { getAnalysesForUserWithCache } from '../lib/documents';
import { ScoreRing, detailsCreateStyles } from './DetailsScreen';

import { formatDateShort } from '../lib/dateFormat';

function getRiskLabelKey(score) {
  const s = Number(score);
  if (Number.isNaN(s)) return 'home.lowRisk';
  if (s < 50) return 'home.highRisk';
  if (s < 70) return 'home.mediumRisk';
  return 'home.lowRisk';
}

const SCREEN_HEIGHT = (() => {
  try {
    const w = Dimensions.get('window');
    const h = w?.height;
    const n = Number(h);
    return Number.isFinite(n) && n > 0 ? n : 800;
  } catch {
    return 800;
  }
})();


function computeCountdown(expiresAt) {
  if (!expiresAt) return { h: 0, m: 0, s: 0 };
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  const secs = Math.max(0, Math.floor((end - now) / 1000));
  return {
    h: Math.floor(secs / 3600),
    m: Math.floor((secs % 3600) / 60),
    s: secs % 60,
  };
}

function applyOfferDiscount(priceCents, offer) {
  if (!offer) return priceCents;
  if (offer.discount_type === 'percent' && (offer.discount_perc != null)) {
    return Math.round(priceCents * (1 - Number(offer.discount_perc) / 100));
  }
  if (offer.discount_type === 'fixed' && (offer.discount_cent != null)) {
    return Math.max(0, priceCents - Number(offer.discount_cent));
  }
  return priceCents;
}

function formatPrice(cents, currency = 'USD') {
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}
const OFFER_CLOSE_ROW_HEIGHT = 44;

function ScanItemCard({ item, onPress, cardStyles, scoreRingStyles, colors }) {
  const s = cardStyles || {};
  return (
    <TouchableOpacity style={s.scanCard} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={s.scanCardLeft}>
        <ScoreRing score={item.score ?? 0} size={56} styles={scoreRingStyles} colors={colors} />
      </View>
      <View style={s.scanCardContent}>
        <Text style={s.scanCardTitle}>{item.title}</Text>
        <View style={s.scanCardTags}>
          {(item.tags || []).map((tag, i) => (
            <View key={i} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={s.scanCardDate}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Фиксированные 4 пункта для bottom sheet оффера (только переводы, не из БД)
const OFFER_SHEET_FEATURES = [
  { feature: 'ai_issue_detection', titleKey: 'home.offerFeature1', freeHas: true },   // AI Issue Detection — ✓ FREE, ✓ PRO
  { feature: 'document_check', titleKey: 'home.offerFeature2', freeHas: false },      // Unlimited document checking
  { feature: 'ai_lawyer', titleKey: 'home.offerFeature3', freeHas: false },           // Smart AI Lawyer assistant
  { feature: 'document_compare', titleKey: 'home.offerFeature4', freeHas: false },   // Unlimited document comparing
];

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { setPreviousTab } = useAILawyerTab();
  const { user } = useAuth();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const scoreRingStyles = useMemo(() => StyleSheet.create(detailsCreateStyles(colors)), [colors]);
  const {
    isPro,
    offers,
    products,
    ensureOfferState,
  } = useSubscription();

  const [recentScans, setRecentScans] = useState([]);
  const [isOfferSheetVisible, setIsOfferSheetVisible] = useState(false);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [userOfferState, setUserOfferState] = useState(null);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  const sheetTranslateY = useRef(new Animated.Value(Number(SCREEN_HEIGHT) || 800)).current;

  const activeOffer = offers?.[0] ?? null;
  const showBanner = !isPro && !!activeOffer;

  const [bannerOfferState, setBannerOfferState] = useState(null);

  useEffect(() => {
    if (!showBanner || activeOffer?.mode !== 'per_user') return;
    let cancelled = false;
    ensureOfferState(activeOffer.id).then((state) => {
      if (!cancelled) setBannerOfferState(state);
    });
    return () => { cancelled = true; };
  }, [showBanner, activeOffer?.id, activeOffer?.mode, ensureOfferState]);

  const bannerExpiresAt = activeOffer?.mode === 'global'
    ? activeOffer?.ends_at
    : bannerOfferState?.expires_at;
  const [bannerCountdown, setBannerCountdown] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!bannerExpiresAt) return;
    const tick = () => setBannerCountdown(computeCountdown(bannerExpiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bannerExpiresAt]);

  // В bottom sheet оффера всегда эти 4 пункта из переводов (не из Supabase)
  const displayFeatures = OFFER_SHEET_FEATURES;

  const getFeatureFreeHas = (f) => f.freeHas === true;

  useFocusEffect(
    React.useCallback(() => {
      setPreviousTab('HomeTab');
    }, [setPreviousTab])
  );

  useEffect(() => {
    const expiresAt = userOfferState?.expires_at ?? currentOffer?.ends_at ?? null;
    if (!expiresAt) return;
    const tick = () => setCountdown(computeCountdown(expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [userOfferState?.expires_at, currentOffer?.ends_at]);

  const formatNum = (n) => String(n).padStart(2, '0');
  const handleScan = () => {
    navigation.navigate('Scanner');
  };
  const handleUpload = () => {
    navigation.navigate('UploadFile');
  };
  const handleCompare = () => {
    navigation.navigate('CompareDocs');
  };
  const handlePasteText = () => {
    navigation.navigate('PasteText');
  };
  const handleSeeAll = () => {
    navigation.navigate('History');
  };

  const fetchRecentScans = useCallback(() => {
    if (!user?.id) {
      setRecentScans([]);
      return;
    }
    getAnalysesForUserWithCache(user.id)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const items = list.slice(0, 3).map((a) => {
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
        });
        setRecentScans(items);
      })
      .catch(() => setRecentScans([]));
  }, [user?.id, t]);

  useFocusEffect(
    useCallback(() => {
      fetchRecentScans();
    }, [fetchRecentScans])
  );

  const openOfferSheet = async () => {
    if (!activeOffer) return;
    setCurrentOffer(activeOffer);
    if (activeOffer.mode === 'per_user') {
      const state = bannerOfferState ?? (await ensureOfferState(activeOffer.id).catch(() => null));
      setUserOfferState(state);
    } else {
      setUserOfferState(null);
    }
    setIsOfferSheetVisible(true);
    sheetTranslateY.setValue(Number(SCREEN_HEIGHT) || 800);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };
  const closeOfferSheet = () => {
    if (currentOffer?.mode === 'per_user' && user?.id && currentOffer?.id) {
      dismissUserOffer(user.id, currentOffer.id).catch(() => {});
    }
    setCurrentOffer(null);
    setUserOfferState(null);
    const h = Number(SCREEN_HEIGHT) || 800;
    Animated.timing(sheetTranslateY, {
      toValue: h,
      duration: 220,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setIsOfferSheetVisible(false);
    });
  };
  const handleGetOffer = () => {
    const offerToPass = currentOffer ?? activeOffer;
    const h = Number(SCREEN_HEIGHT) || 800;
    Animated.timing(sheetTranslateY, {
      toValue: h,
      duration: 220,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsOfferSheetVisible(false);
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Subscription', {
            fromOffer: true,
            offerId: offerToPass?.id ?? null,
          });
        }
      }
    });
  };
  const handleScanPress = (item) => {
    navigation.navigate('Details', { analysisId: item.id });
  };
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        const dy = Number(gesture.dy);
        const dx = Number(gesture.dx);
        return Number.isFinite(dy) && dy > 8 && Math.abs(dy) > Math.abs(Number.isFinite(dx) ? dx : 0);
      },
      onPanResponderMove: (_, gesture) => {
        const y = Number(gesture.dy);
        const val = Number.isFinite(y) ? (y >= 0 ? y : Math.max(-30, y)) : 0;
        sheetTranslateY.setValue(val);
      },
      onPanResponderRelease: (_, gesture) => {
        const dy = Number(gesture.dy);
        const vy = Number(gesture.vy);
        if (Number.isFinite(dy) && dy > 100) {
          closeOfferSheet();
          return;
        }
        if (Number.isFinite(vy) && vy > 0.8) {
          closeOfferSheet();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.appBar}>
        <Text style={styles.headerTitle}>{t('home.headerTitle')}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan Document Now */}
        <TouchableOpacity style={styles.scanArea} onPress={handleScan} activeOpacity={0.8}>
          <Camera size={32} color={colors.primary} strokeWidth={1.5} />
          <Text style={styles.scanAreaText}>{t('home.scanNow')}</Text>
        </TouchableOpacity>

        {/* Upload & Compare */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUpload} activeOpacity={0.8}>
            <CloudUpload size={24} color={colors.primaryText} strokeWidth={2} />
            <Text style={styles.actionButtonText}>{t('home.uploadFile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleCompare} activeOpacity={0.8}>
            <Files size={24} color={colors.primaryText} strokeWidth={2} />
            <Text style={styles.actionButtonText}>{t('home.compareDocs')}</Text>
          </TouchableOpacity>
        </View>

        {/* Paste text button */}
        <TouchableOpacity style={styles.pasteRow} onPress={handlePasteText} activeOpacity={0.8}>
          <Text style={styles.pasteButtonText}>{t('home.pasteDocText')}</Text>
          <ArrowRight size={24} color={colors.primaryText} strokeWidth={2} />
        </TouchableOpacity>

        {/* Limited Offer Banner */}
        {showBanner && (
        <TouchableOpacity style={styles.banner} activeOpacity={0.9} onPress={openOfferSheet}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{activeOffer?.title || t('home.limitedOffer')}</Text>
            <Text style={styles.bannerDiscount}>{activeOffer?.subtitle || '50% OFF'}</Text>
            <View style={styles.countdown}>
              <View style={styles.countdownBox}>
                <Text style={styles.countdownText}>{formatNum(bannerCountdown.h)}</Text>
              </View>
              <Text style={styles.countdownColon}> : </Text>
              <View style={styles.countdownBox}>
                <Text style={styles.countdownText}>{formatNum(bannerCountdown.m)}</Text>
              </View>
              <Text style={styles.countdownColon}> : </Text>
              <View style={styles.countdownBox}>
                <Text style={styles.countdownText}>{formatNum(bannerCountdown.s)}</Text>
              </View>
            </View>
          </View>
          <Image source={require('../../assets/offer.png')} style={styles.bannerImage} resizeMode="contain" />
        </TouchableOpacity>
        )}

        {/* Recent Scans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recentScans')}</Text>
            <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {recentScans.map((item) => (
            <ScanItemCard key={item.id} item={item} onPress={handleScanPress} cardStyles={styles} scoreRingStyles={scoreRingStyles} colors={colors} />
          ))}
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="none"
        visible={isOfferSheetVisible}
        onRequestClose={closeOfferSheet}
      >
        <Pressable style={styles.offerSheetBackdrop} onPress={closeOfferSheet} />
        <Animated.View
          style={[styles.offerSheetColumn, { transform: [{ translateY: sheetTranslateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.offerCloseRow}>
            <TouchableOpacity
              style={styles.offerClose}
              onPress={closeOfferSheet}
              activeOpacity={0.8}
            >
              <X size={22} color="#ffffff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={styles.offerSheet}>
          <Image source={require('../../assets/limited-offer.png')} style={styles.offerSheetGift} resizeMode="contain" />

          <View style={styles.offerSheetCountdown}>
            <View style={styles.offerSheetCountdownBox}>
              <Text style={styles.offerSheetCountdownText}>{formatNum(countdown.h)}</Text>
            </View>
            <Text style={styles.offerSheetCountdownColon}> : </Text>
            <View style={styles.offerSheetCountdownBox}>
              <Text style={styles.offerSheetCountdownText}>{formatNum(countdown.m)}</Text>
            </View>
            <Text style={styles.offerSheetCountdownColon}> : </Text>
            <View style={styles.offerSheetCountdownBox}>
              <Text style={styles.offerSheetCountdownText}>{formatNum(countdown.s)}</Text>
            </View>
          </View>

          <Text style={styles.offerSheetTitle}>{t('home.temporaryDiscount')}</Text>

          {/* Header row */}
          <View style={styles.offerTableHeaderRow}>
            <View style={styles.offerTableHeaderSpacer} />
            <View style={styles.offerTableHeaderCol}>
              <Text style={styles.offerTableHeaderText}>{t('home.free')}</Text>
            </View>
            <View style={styles.offerTableHeaderCol}>
              <Text style={styles.offerTableHeaderText}>{t('home.pro')}</Text>
            </View>
          </View>

          {/* Content row — 3 columns */}
          <View style={styles.offerTableBody}>
            <View style={styles.offerLabelsCol}>
              {displayFeatures.map((f, i) => (
                <View key={f.feature || i} style={styles.offerLabelSlot}>
                  <Text style={styles.offerRowLabel}>{f.titleKey ? t(f.titleKey) : (f.title || '')}</Text>
                </View>
              ))}
            </View>
            <View style={styles.offerFreeCol}>
              {displayFeatures.map((f, i) => {
                const has = getFeatureFreeHas(f);
                const Icon = has ? IconRosetteDiscountCheckFilled : IconCircleXFilled;
                const col = has ? '#22c55e' : '#9ca3af';
                return (
                  <View key={f.feature || i} style={styles.offerIconSlot}>
                    <Icon size={24} color={col} />
                  </View>
                );
              })}
            </View>
            <View style={styles.offerProCol}>
              {displayFeatures.map((f, i) => (
                <View key={f.feature || i} style={styles.offerIconSlot}>
                  <IconRosetteDiscountCheckFilled size={24} color="#22c55e" />
                </View>
              ))}
            </View>
          </View>

          {(() => {
            const yearlyProduct = products?.find((p) => p.interval === 'yearly');
            const basePrice = yearlyProduct?.price_cents ?? 2599;
            const discounted = applyOfferDiscount(basePrice, currentOffer || activeOffer);
            const currency = yearlyProduct?.currency ?? 'USD';
            const perMonth = Math.round(discounted / 12);
            return (
              <>
                <Text style={styles.offerPrice}>{formatPrice(discounted, currency)} {t('home.offerYearly')}</Text>
                <Text style={styles.offerPriceSub}>{t('home.offerOnlyPerMonth', { price: formatPrice(perMonth, currency) })}</Text>
              </>
            );
          })()}

          <TouchableOpacity style={styles.offerCta} activeOpacity={0.9} onPress={handleGetOffer}>
            <Text style={styles.offerCtaText}>
              {t('home.getOfferCta', { discount: currentOffer?.subtitle || activeOffer?.subtitle || '50%' })}
            </Text>
          </TouchableOpacity>

          <View style={styles.offerFooterLinks}>
            <Text style={styles.offerFooterLink}>{t('subscription.termsOfUse')}</Text>
            <Text style={styles.offerFooterLink}>{t('subscription.privacyPolicy')}</Text>
          </View>

          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    appBar: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.primaryBackground,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: Platform.OS === 'android' ? 64 + 24 : 64,
    },
    headerTitle: {
      fontFamily,
      fontSize: 24,
      fontWeight: Platform.OS === 'android' ? '800' : '700',
      color: colors.primaryText,
    },
    scanArea: {
      backgroundColor: colors.accent1,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    scanAreaText: {
      fontFamily,
      fontSize: 16,
      fontWeight: '500',
      color: colors.primary,
      marginTop: spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.secondaryBackground,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    actionButtonText: {
      fontFamily,
      fontSize: 14,
      fontWeight: '500',
      color: colors.primaryText,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    pasteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondaryBackground,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
      height: 56,
      marginBottom: spacing.sm,
      minHeight: 56,
    },
    pasteButtonText: {
      flex: 1,
      fontFamily,
      fontSize: 16,
      fontWeight: '400',
      color: colors.primaryText,
    },
    banner: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      marginBottom: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    offerSheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    offerSheetColumn: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    offerCloseRow: {
      height: OFFER_CLOSE_ROW_HEIGHT,
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
      justifyContent: 'center',
      marginBottom: 8,
    },
    offerClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    offerSheet: {
      backgroundColor: '#171819',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.md,
      paddingTop: 12,
      paddingBottom: 8,
    },
    offerSheetGift: {
      position: 'absolute',
      top: -72,
      right: 0,
      width: 168,
      height: 168,
      zIndex: 2,
    },
    offerSheetCountdown: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
    offerSheetCountdownBox: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 8,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    offerSheetCountdownText: {
      fontFamily,
      fontSize: 24,
      fontWeight: '700',
      color: '#ffffff',
      lineHeight: 30,
    },
    offerSheetCountdownColon: {
      fontFamily,
      fontSize: 24,
      fontWeight: '700',
      color: '#ffffff',
      marginHorizontal: 4,
    },
    offerSheetTitle: {
      fontFamily,
      fontSize: 28,
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    offerTableHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
    offerTableHeaderSpacer: { flex: 1 },
    offerTableHeaderCol: { width: 64, alignItems: 'center', justifyContent: 'center' },
    offerTableHeaderText: {
      fontFamily,
      fontSize: 12,
      fontWeight: '500',
      color: '#ffffff',
    },
    offerTableBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      height: 202,
      marginBottom: spacing.lg,
    },
    offerLabelsCol: { flex: 1, height: '100%', paddingVertical: 12 },
    offerLabelSlot: { flex: 1, justifyContent: 'center', paddingVertical: 8 },
    offerRowLabel: {
      fontFamily,
      fontSize: 14,
      fontWeight: '500',
      color: '#ffffff',
    },
    offerFreeCol: { padding: 12 },
    offerProCol: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#38a010',
    },
    offerIconSlot: { padding: 8, alignItems: 'center', justifyContent: 'center' },
    offerPrice: {
      fontFamily,
      fontSize: 22,
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
      marginBottom: 2,
    },
    offerPriceSub: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      color: '#9ca3af',
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    offerCta: {
      height: 52,
      borderRadius: 18,
      backgroundColor: '#3b82f6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    offerCtaText: {
      fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    offerFooterLinks: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    offerFooterLink: { fontFamily, fontSize: 14, fontWeight: '400', color: '#9ca3af' },
    bannerContent: { flex: 1 },
    bannerTitle: {
      fontFamily,
      fontSize: 20,
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: spacing.xxs,
    },
    bannerDiscount: {
      fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
      marginBottom: spacing.md,
    },
    countdown: { flexDirection: 'row', alignItems: 'center' },
    countdownBox: {
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 8,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    countdownText: {
      fontFamily,
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    countdownColon: {
      fontFamily,
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      marginHorizontal: 2,
    },
    bannerImage: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 120,
      height: 120,
    },
    section: { marginBottom: spacing.xl },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontFamily,
      fontSize: 20,
      fontWeight: Platform.OS === 'android' ? '700' : '600',
      color: colors.primaryText,
    },
    seeAll: {
      fontFamily,
      fontSize: 16,
      fontWeight: '500',
      color: colors.primary,
    },
    scanCard: {
      flexDirection: 'row',
      backgroundColor: colors.secondaryBackground,
      borderRadius: 20,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.tertiary,
    },
    scanCardLeft: { marginRight: spacing.md },
    scanCardContent: { flex: 1 },
    scanCardTitle: {
      fontFamily,
      fontSize: 16,
      fontWeight: Platform.OS === 'android' ? '600' : '500',
      color: colors.primaryText,
      marginBottom: spacing.xs,
    },
    scanCardTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    tag: {
      backgroundColor: colors.alternate,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 8,
      height: 28,
      justifyContent: 'center',
    },
    tagText: {
      fontFamily,
      fontSize: 12,
      fontWeight: '500',
      color: colors.secondaryText,
    },
    scanCardDate: {
      fontFamily,
      fontSize: 12,
      fontWeight: '400',
      color: colors.secondaryText,
    },
  };
}
