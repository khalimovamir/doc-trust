/**
 * AI Lawyer - Details Screen
 * Design from Figma: analysis results with Summary / Red Flags / Guidance tabs
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Circle,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Globe,
} from 'lucide-react-native';
import { IconCircleCheckFilled } from '@tabler/icons-react-native';
import { MenuView } from '@react-native-menu/menu';
import { NativeHeaderButtonEllipsis } from '../components/NativeHeaderButton';
import Svg, { Circle as SvgCircle } from 'react-native-svg';

import { fontFamily, spacing, useTheme } from '../theme';
import { SkeletonDetails } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { useAnalysis } from '../context/AnalysisContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from 'react-i18next';
import { getAnalysisByIdCached, updateGuidanceItemDone, deleteAnalysisWithRelated } from '../lib/documents';
import { createChat, addChatMessage, getChatByAnalysisId } from '../lib/chat';
import { getDocumentChatInitial } from '../lib/chatGreeting';
import { formatDateShort, formatDateLocalized } from '../lib/dateFormat';
import { exportAnalysisToPdf } from '../lib/exportPdf';

const TABS_KEYS = ['tabSummary', 'tabRedFlags', 'tabGuidance'];

/* ── Segmented Control (3 tabs, iOS-style, draggable indicator) ── */
const SEGMENT_PADDING = 4;
const SEGMENT_HEIGHT = 42;
const SEGMENT_RADIUS = 12;
const INDICATOR_RADIUS = 9;

function DraggableSegmentedControl({ activeIndex, onIndexChange, labels, styles }) {
  const { colors } = useTheme();
  const count = labels.length;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const tabWidth = segmentWidth > 0 ? (segmentWidth - SEGMENT_PADDING * 2) / count : 0;
  const indicatorX = useRef(new Animated.Value(0)).current;
  const startX = useRef(0);
  const currentX = useRef(0);
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const tabWidthRef = useRef(tabWidth);
  tabWidthRef.current = tabWidth;

  useEffect(() => {
    const id = indicatorX.addListener(({ value }) => { currentX.current = value; });
    return () => indicatorX.removeListener(id);
  }, []);

  const onSegmentLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== segmentWidth) {
      setSegmentWidth(w);
      const tw = (w - SEGMENT_PADDING * 2) / count;
      const val = activeIndex * tw;
      indicatorX.setValue(val);
      currentX.current = val;
    }
  };

  const switchTab = useCallback((index) => {
    const tw = tabWidthRef.current;
    if (tw <= 0) return;
    Animated.timing(indicatorX, {
      toValue: index * tw,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (typeof onIndexChangeRef.current === 'function') onIndexChangeRef.current(index);
  }, [indicatorX]);

  useEffect(() => {
    const tw = tabWidthRef.current;
    if (tw <= 0) return;
    Animated.timing(indicatorX, {
      toValue: activeIndex * tw,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, indicatorX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderGrant: () => { startX.current = currentX.current; },
      onPanResponderMove: (_, g) => {
        const tw = tabWidthRef.current;
        if (tw <= 0) return;
        const newX = startX.current + g.dx;
        const maxX = (count - 1) * tw;
        indicatorX.setValue(Math.max(0, Math.min(newX, maxX)));
      },
      onPanResponderRelease: () => {
        const tw = tabWidthRef.current;
        if (tw <= 0) return;
        const nearest = Math.round(currentX.current / tw);
        const clamped = Math.max(0, Math.min(count - 1, nearest));
        Animated.timing(indicatorX, {
          toValue: clamped * tw,
          duration: 150,
          useNativeDriver: false,
        }).start();
        if (typeof onIndexChangeRef.current === 'function') onIndexChangeRef.current(clamped);
      },
    })
  ).current;

  return (
    <View
      style={styles.segmentContainer}
      onLayout={onSegmentLayout}
      {...panResponder.panHandlers}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.segmentIndicator,
            { width: tabWidth },
            { transform: [{ translateX: indicatorX }] },
          ]}
        />
      )}
      {labels.map((label, index) => (
        <TouchableOpacity
          key={label}
          style={styles.segmentButton}
          onPress={() => switchTab(index)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeIndex === index ? colors.primaryText : colors.secondaryText },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ── Red Flags data ── */
function normalizeIssueType(typeOrSeverity) {
  if (!typeOrSeverity) return 'tip';
  const t = String(typeOrSeverity).toLowerCase();
  if (t === 'critical' || t === 'high') return 'critical';
  if (t === 'warning' || t === 'medium') return 'warning';
  if (t === 'tip' || t === 'low') return 'tip';
  return 'tip';
}

function getRedFlagsFilters(redFlags) {
  const normalized = (redFlags || []).map((r) => ({
    ...r,
    type: normalizeIssueType(r.type || r.severity),
  }));
  const all = normalized.length;
  const critical = normalized.filter((r) => r.type === 'critical').length;
  const warning = normalized.filter((r) => r.type === 'warning').length;
  const tip = normalized.filter((r) => r.type === 'tip').length;
  const t = arguments[1];
  const label = (key) => (typeof t === 'function' ? t(key) : key);
  return [
    { id: 'all', label: label('analysis.filterAllIssues'), count: all },
    { id: 'critical', label: label('analysis.filterCritical'), count: critical },
    { id: 'warning', label: label('analysis.filterWarnings'), count: warning },
    { id: 'tip', label: label('analysis.filterTips'), count: tip },
  ];
}

function getNormalizedRedFlags(redFlags) {
  return (redFlags || []).map((r) => ({
    ...r,
    type: normalizeIssueType(r.type || r.severity),
  }));
}

const RED_FLAGS_ITEMS = [
  {
    id: '1',
    type: 'tip',
    section: 'Section 1',
    title: 'No Scope Change Process',
    whyMatters:
      'The agreement lacks a formal change order process. If the client requests work beyond the original scope, there is no mechanism to adjust timelines or compensation.',
    whatToDo:
      'Add a change order clause requiring written approval and adjusted compensation for any work outside the original scope defined in Exhibit A.',
  },
  {
    id: '2',
    type: 'tip',
    section: 'Section 1.2',
    title: 'Missing Payment Terms for Revisions',
    whyMatters:
      'While revision rounds are limited to two, there is no cap on the scope of revisions within each round. A single revision could require substantial rework.',
    whatToDo:
      'Define what constitutes a "revision round" (e.g., up to 10 hours of work) and add compensation for work exceeding that scope.',
  },
  {
    id: '3',
    type: 'critical',
    section: 'Section 2',
    title: 'Unlimited Liability Clause',
    whyMatters:
      'The contract places unlimited liability on the contractor for any damages arising from the deliverables, which is disproportionate to the contract value.',
    whatToDo:
      'Negotiate a liability cap equal to the total contract value and exclude consequential damages.',
  },
  {
    id: '4',
    type: 'critical',
    section: 'Section 3',
    title: 'Automatic IP Transfer Without Payment',
    whyMatters:
      'All intellectual property rights transfer to the client upon creation, not upon payment. This means unpaid work still belongs to the client.',
    whatToDo:
      'Add a clause that IP transfers only upon receipt of full payment for the related deliverables.',
  },
  {
    id: '5',
    type: 'critical',
    section: 'Section 4.1',
    title: 'Unilateral Termination Rights',
    whyMatters:
      'The client can terminate the contract at any time without cause, but the contractor cannot. This creates an imbalanced termination provision.',
    whatToDo:
      'Negotiate mutual termination rights with a reasonable notice period and payment for completed work.',
  },
  {
    id: '6',
    type: 'warning',
    section: 'Section 2.3',
    title: 'Vague Deliverable Descriptions',
    whyMatters:
      'The deliverables are described in broad terms without specific acceptance criteria, which could lead to scope creep disputes.',
    whatToDo:
      'Add detailed specifications and measurable acceptance criteria for each deliverable in the statement of work.',
  },
  {
    id: '7',
    type: 'warning',
    section: 'Section 5',
    title: 'Non-Compete Clause Too Broad',
    whyMatters:
      'The non-compete restriction covers the entire industry for 2 years, which may prevent the contractor from working with similar clients.',
    whatToDo:
      'Narrow the scope to direct competitors only and reduce the duration to 6 months.',
  },
  {
    id: '8',
    type: 'warning',
    section: 'Section 6',
    title: 'No Late Payment Penalties',
    whyMatters:
      'There are no provisions for late payment interest or penalties, giving the client little incentive to pay on time.',
    whatToDo:
      'Add a late payment clause with interest at 1.5% per month on overdue invoices.',
  },
];

function getIssueTypeConfig(colors) {
  return {
    critical: {
      label: 'CRITICAL',
      color: colors.error,
      bgColor: colors.accent3,
      Icon: AlertOctagon,
    },
    warning: {
      label: 'WARNING',
      color: colors.warning,
      bgColor: colors.accent4,
      Icon: AlertTriangle,
    },
    tip: {
      label: 'TIP',
      color: colors.success,
      bgColor: colors.accent2,
      Icon: Lightbulb,
    },
  };
}

function RedFlagsEmpty({ styles, colors, t }) {
  return (
    <View style={styles.redFlagsEmptyWrap}>
      <View style={styles.redFlagsEmptyIconCard}>
        <AlertTriangle size={28} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.redFlagsEmptyTitle}>{t('details.redFlagsEmptyTitle')}</Text>
      <Text style={styles.redFlagsEmptyDescription}>{t('details.redFlagsEmptyDescription')}</Text>
    </View>
  );
}

function GuidanceEmpty({ styles, colors, t }) {
  return (
    <View style={styles.guidanceEmptyWrap}>
      <View style={styles.guidanceEmptyIconCard}>
        <Lightbulb size={28} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.guidanceEmptyTitle}>{t('details.guidanceEmptyTitle')}</Text>
      <Text style={styles.guidanceEmptyDescription}>{t('details.guidanceEmptyDescription')}</Text>
    </View>
  );
}

/* ── Guidance data ── */
const GUIDANCE_ITEMS = [
  {
    id: '1',
    text: 'Negotiate mutual termination clause with payment for completed work',
    severity: 'high',
    section: 'Section 1',
  },
  {
    id: '2',
    text: 'Remove or significantly reduce non-compete clause',
    severity: 'high',
    section: 'Section 2.1',
  },
  {
    id: '3',
    text: 'Define specific competitor list instead of client discretion',
    severity: 'medium',
    section: 'Section 3.2',
  },
  {
    id: '4',
    text: 'Add mutual indemnification provisions',
    severity: 'low',
    section: 'Section 1',
  },
];

function getSeverityConfig(colors) {
  return {
    high: { label: 'High', color: colors.error },
    medium: { label: 'Medium', color: colors.warning },
    low: { label: 'Low', color: colors.success },
  };
}

/* ── Components ── */
const RING_SIZE_DEFAULT = 80;
const RING_STROKE_DEFAULT = 6;

const SCORE_RING_ANIM_DURATION_MS = 800;

function ScoreRing({ score, size = RING_SIZE_DEFAULT, styles, colors }) {
  const numScore = Number(score);
  const safeScore = Number.isNaN(numScore) ? 0 : Math.min(100, Math.max(0, numScore));
  const sizeNum = Number(size);
  const safeSize = Number.isNaN(sizeNum) || sizeNum <= 0 ? RING_SIZE_DEFAULT : sizeNum;
  const stroke = Math.max(3, Math.round((RING_STROKE_DEFAULT * safeSize) / RING_SIZE_DEFAULT));
  const R = Math.max(0, (safeSize - stroke) / 2);
  const CX = safeSize / 2;
  const CY = safeSize / 2;
  const circumference = Math.max(0, 2 * Math.PI * R);
  const scoreColor =
    safeScore === 0 ? colors.error
    : safeScore >= 70 ? colors.success
    : safeScore >= 50 ? colors.warning
    : colors.error;
  const targetDashOffset = Math.max(0, Math.min(circumference, circumference * (1 - safeScore / 100)));
  const textSize = safeSize <= 56 ? 14 : 20;

  const [animProgress, setAnimProgress] = useState(0);
  const animStartRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    setAnimProgress(0);
    animStartRef.current = null;
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      const now = Date.now();
      if (animStartRef.current == null) animStartRef.current = now;
      const elapsed = now - animStartRef.current;
      const t = Math.min(1, elapsed / SCORE_RING_ANIM_DURATION_MS);
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2;
      setAnimProgress(ease);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(start);
      }
    };
    rafRef.current = requestAnimationFrame(start);
    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [safeScore]);

  const dashOffset = circumference * (1 - animProgress * (safeScore / 100));
  const displayScore = Math.round(animProgress * safeScore);
  const safeDashOffset = Number.isFinite(dashOffset) ? Math.max(0, Math.min(circumference, dashOffset)) : targetDashOffset;

  return (
    <View style={[styles.scoreRing, { width: safeSize, height: safeSize }]}>
      <Svg width={safeSize} height={safeSize} style={styles.scoreRingSvg}>
        <SvgCircle
          cx={CX}
          cy={CY}
          r={R}
          stroke={safeScore === 0 ? scoreColor : colors.alternate}
          strokeWidth={stroke}
          fill="none"
        />
        <SvgCircle
          cx={CX}
          cy={CY}
          r={R}
          stroke={scoreColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={safeDashOffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${CX}, ${CY})`}
        />
      </Svg>
      <View style={styles.scoreRingTextWrap}>
        <Text style={[styles.scoreText, { fontSize: textSize }]}>{displayScore}</Text>
      </View>
    </View>
  );
}

function GuidanceCard({ item, onToggleDone, showCheckbox = true, styles, severityConfig, colors }) {
  const config = severityConfig[item?.severity] || severityConfig.medium;
  const isDone = !!item?.is_done;
  const hasDbId = typeof item?.id === 'string' && item.id.length > 20;
  return (
    <View style={styles.guideCard}>
      <View style={styles.guideCardTop}>
        <Text style={[styles.guideCardText, isDone && styles.guideCardTextDone]}>{item?.text}</Text>
        {showCheckbox && (
          <TouchableOpacity
            style={styles.checkWrap}
            onPress={() => hasDbId && onToggleDone?.(item.id, !isDone)}
            disabled={!hasDbId}
            activeOpacity={0.7}
          >
            {isDone ? (
              <IconCircleCheckFilled size={20} color={colors.success} />
            ) : (
              <Circle size={20} color={colors.tertiary} strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.guideCardTags}>
        <View style={styles.severityBadge}>
          <View style={[styles.severityDot, { backgroundColor: config.color }]} />
          <Text style={styles.severityText}>{config.label}</Text>
        </View>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{item.section}</Text>
        </View>
      </View>
    </View>
  );
}

function IssueCard({ item, onAskAi, askAiLabel = 'Ask AI', copyTextLabel = 'Copy Text', styles, issueTypeConfig, colors }) {
  const config = issueTypeConfig[item?.type] || issueTypeConfig.tip;
  const TypeIcon = config.Icon;
  const handleCopy = async () => {
    const text = [item.title, '', 'Why this matters:', item.whyMatters || '', '', 'What to do:', item.whatToDo || ''].filter(Boolean).join('\n');
    await Clipboard.setStringAsync(text);
  };
  return (
    <View style={styles.issueCard}>
      {/* Type badge + Section */}
      <View style={styles.issueCardHeader}>
        <View style={[styles.issueTypeBadge, { backgroundColor: config.bgColor }]}>
          <TypeIcon size={20} color={config.color} strokeWidth={2} />
          <Text style={[styles.issueTypeBadgeText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        <Text style={styles.issueSectionText}>{item.section}</Text>
      </View>

      {/* Title */}
      <Text style={styles.issueTitle}>{item.title}</Text>

      {/* Why this matters */}
      <View style={styles.issueTextBlock}>
        <Text style={styles.issueSubLabel}>Why this matters:</Text>
        <Text style={styles.issueBodyText}>{item.whyMatters}</Text>
      </View>

      {/* What to do */}
      <View style={styles.issueTextBlock}>
        <Text style={styles.issueSubLabelBlue}>What to do:</Text>
        <Text style={styles.issueBodyText}>{item.whatToDo}</Text>
      </View>

      {/* Divider */}
      <View style={styles.issueDivider} />

      {/* Action buttons */}
      <View style={styles.issueActions}>
        <TouchableOpacity style={styles.askAiSmall} activeOpacity={0.7} onPress={onAskAi}>
          <Sparkles size={20} color={colors.primary} strokeWidth={2} />
          <Text style={styles.askAiSmallText}>{askAiLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.copyButton} activeOpacity={0.7} onPress={handleCopy}>
          <Copy size={20} color={colors.secondaryText} strokeWidth={2} />
          <Text style={styles.copyButtonText}>{copyTextLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FALLBACK = {
  summary: 'A freelance development agreement where TechVision Corp. hires Alex Rivera for web development services.',
  documentType: 'Deal Contract',
  parties: [{ name: 'T-1000 Group', role: 'Client' }, { name: 'John Anderson', role: 'Contractor' }],
  contractAmount: '$58,000',
  payments: [
    { label: 'Signing Payment', amount: '$12,000' },
    { label: 'Mid-project milestone', amount: '$13,500' },
    { label: 'Final delivery', amount: '$32,500' },
  ],
  keyDates: [
    { date: 'February 15, 2026', label: 'Agreement Date' },
    { date: 'February 20, 2026', label: 'Project Start Date' },
    { date: 'March 20, 2026', label: 'Mid-Project Milestone' },
    { date: 'April 20, 2026', label: 'Final Delivery' },
  ],
};

const SUMMARY_TRUNCATE_LEN = 200;

function SummaryContent({ analysis, jurisdictionCode, onJurisdictionEdit, hideJurisdiction, styles }) {
  const { t } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  const a = analysis || {};
  const summary = a.summary || FALLBACK.summary;
  const docType = a.documentType || FALLBACK.documentType;
  const parties = a.parties || FALLBACK.parties;
  const contractAmount = a.contractAmount || FALLBACK.contractAmount;
  const payments = a.payments || FALLBACK.payments;
  const keyDates = a.keyDates || FALLBACK.keyDates;
  const needsTruncate = summary.length > SUMMARY_TRUNCATE_LEN;
  const displaySummary = needsTruncate && !showMore ? summary.slice(0, SUMMARY_TRUNCATE_LEN) + '...' : summary;

  return (
    <View style={styles.cardList}>
      <View style={styles.sCard}>
        <Text style={styles.sCardTitle}>{t('analysis.summaryTitle')}</Text>
        <Text style={styles.sCardBody}>
          {displaySummary}
          {needsTruncate && (
            <>
              {' '}
              <Text style={styles.showMoreLink} onPress={() => setShowMore(!showMore)}>
                {showMore ? t('analysis.showLess') : t('analysis.showMore')}
              </Text>
            </>
          )}
        </Text>
      </View>

      <View style={styles.sCard}>
        <View style={styles.sLabelGroup}>
          <Text style={styles.sLabel}>{t('analysis.documentType')}</Text>
          <Text style={styles.sValue}>{docType}</Text>
        </View>
        <View style={styles.sRowList}>
          {parties.map((p) => (
            <View key={p.name} style={styles.sRow}>
              <Text style={styles.sRowLeft}>{p.name}</Text>
              <Text style={styles.sRowRight}>{p.role}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Contract amount card */}
      <View style={styles.sCard}>
        <View style={styles.sLabelGroup}>
          <Text style={styles.sLabel}>{t('analysis.contractAmount')}</Text>
          <Text style={styles.sValue}>{contractAmount}</Text>
        </View>
        <View style={styles.sRowList}>
          {payments.map((p) => (
            <View key={p.label} style={styles.sRow}>
              <Text style={styles.sRowLeft} numberOfLines={5}>{p.label}</Text>
              <Text style={styles.sRowRight} numberOfLines={5}>{p.amount}</Text>
            </View>
          ))}
        </View>

      </View>

      <View style={styles.sCard}>
        <Text style={styles.sCardTitle}>{t('analysis.keyDates')}</Text>
        <View style={styles.timeline}>
          {(Array.isArray(keyDates) ? keyDates : []).map((item, index) => {
            const arr = Array.isArray(keyDates) ? keyDates : [];
            const isLast = index === arr.length - 1;
            return (
              <View key={item?.date ? `${item.date}-${index}` : index} style={styles.timelineRow}>
                <View style={styles.timelineDotCol}>
                  <View style={styles.timelineDot} />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={[styles.timelineContent, !isLast && { paddingBottom: 16 }]}>
                  <Text style={styles.timelineDate}>{item?.date ? formatDateLocalized(item.date) : ''}</Text>
                  <Text style={styles.timelineLabel}>{item?.label ?? ''}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Jurisdiction section — hidden on History Details */}
      {!hideJurisdiction && (
        <View style={styles.jurisdictionSection}>
          <Text style={styles.sCardTitle}>{t('analysis.jurisdictionTitle')}</Text>
          <View style={styles.jurisdictionCard}>
            <View style={styles.jurisdictionInfo}>
              <Text style={styles.jurisdictionCountry}>{t('jurisdictions.country' + (jurisdictionCode || 'US'))}</Text>
              <Text style={styles.jurisdictionLaw}>Common Law</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onJurisdictionEdit}>
              <Text style={styles.jurisdictionEdit}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function DetailsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors, isDarkMode } = useTheme();
  const { analysis, setAnalysis } = useAnalysis();
  const { profile } = useProfile();
  const analysisId = route.params?.analysisId;
  const [activeTab, setActiveTab] = useState(0);
  const tabLabels = TABS_KEYS.map((k) => t('analysis.' + k));
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const severityConfig = useMemo(() => getSeverityConfig(colors), [colors]);
  const issueTypeConfig = useMemo(() => getIssueTypeConfig(colors), [colors]);
  const analysisRef = useRef(analysis);
  analysisRef.current = analysis;

  useEffect(() => {
    if (!analysisId) return;
    if (analysis?.id === analysisId) return;
    setAnalysis(null);
    setLoading(true);
    let cancelled = false;
    getAnalysisByIdCached(analysisId)
      .then((a) => {
        if (!cancelled) setAnalysis(a);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [analysisId, analysis?.id, setAnalysis]);

  const rawRedFlags = analysis?.redFlags || RED_FLAGS_ITEMS;
  const redFlags = getNormalizedRedFlags(rawRedFlags);
  const guidance = analysis?.guidance || GUIDANCE_ITEMS;
  const rawScore = analysis?.score;
  const score = typeof rawScore === 'number' && !Number.isNaN(rawScore) ? rawScore : 35;
  const title = analysis?.title || analysis?.documentType || 'Product Deal Issue';
  const criticalCount = redFlags.filter((r) => r.type === 'critical').length;
  const warningCount = redFlags.filter((r) => r.type === 'warning').length;

  const menuActions = React.useMemo(
    () => [
      {
        id: 'share',
        title: t('details.share'),
        image: Platform.select({ ios: 'square.and.arrow.up', android: 'ic_menu_share' }),
        imageColor: Platform.select({ ios: colors.primaryText, android: colors.primaryText }),
      },
      {
        id: 'export',
        title: t('details.exportPdf'),
        image: Platform.select({ ios: 'square.and.arrow.down', android: 'ic_menu_save' }),
        imageColor: Platform.select({ ios: colors.primaryText, android: colors.primaryText }),
      },
      {
        id: 'compare',
        title: t('details.compare'),
        image: Platform.select({ ios: 'doc.on.doc', android: 'ic_menu_agenda' }),
        imageColor: Platform.select({ ios: colors.primaryText, android: colors.primaryText }),
      },
      {
        id: 'delete',
        title: t('details.delete'),
        attributes: { destructive: true },
        image: Platform.select({ ios: 'trash', android: 'ic_menu_delete' }),
        imageColor: Platform.select({ ios: '#ff3b30', android: '#ff3b30' }),
      },
    ],
    [t, colors.primaryText]
  );

  const handleConfirmDelete = async () => {
    const id = analysisId || analysisRef.current?.id;
    if (!id) {
      navigation.goBack();
      return;
    }
    try {
      await deleteAnalysisWithRelated(id);
      setAnalysis(null);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || t('details.deleteFailed'));
    }
  };

  const menuActionRef = useRef(() => {});
  menuActionRef.current = (eventId) => {
    const currentAnalysis = analysisRef.current;
    if (eventId === 'delete') {
      Alert.alert(
        t('details.deleteTitle'),
        t('details.deleteMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('details.deleteConfirm'), style: 'destructive', onPress: handleConfirmDelete },
        ]
      );
    }
    if (eventId === 'share' || eventId === 'export') {
      const isShare = eventId === 'share';
      const dialogTitle = isShare ? t('details.share') : t('details.exportPdf');
      exportAnalysisToPdf(currentAnalysis, { dialogTitle }).catch((e) =>
        Alert.alert(t('details.exportFailed'), e?.message || t('details.couldNotCreatePdf'))
      );
    }
    if (eventId === 'compare') {
      const docTitle = currentAnalysis?.title || currentAnalysis?.documentType || 'Document';
      const text_content = currentAnalysis?.text_content ?? '';
      navigation.navigate('CompareDocs', { text_content, title: docTitle });
    }
  };

  const handleMenuAction = ({ nativeEvent }) => {
    menuActionRef.current(nativeEvent.event);
  };

  const handleTabPress = (index) => {
    setActiveTab(index);
  };

  const handleGuidanceToggle = async (itemId, isDone) => {
    try {
      await updateGuidanceItemDone(itemId, isDone);
      setAnalysis((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        next.guidance = (next.guidance || []).map((g) =>
          g.id === itemId ? { ...g, is_done: isDone } : g
        );
        return next;
      });
    } catch (_) {}
  };

  const { user } = useAuth();
  const { setCurrentChatId, setChatContext, setRefreshChatTrigger } = useAILawyerChat();

  const handleAskAI = async (issueItem) => {
    if (!user?.id) return;
    const docInitial = getDocumentChatInitial(analysis, issueItem ?? null, t);
    let context;
    if (issueItem) {
      const copyText = [issueItem.title, '', 'Why this matters:', issueItem.whyMatters || '', '', 'What to do:', issueItem.whatToDo || ''].filter(Boolean).join('\n');
      context = {
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
          contextText: copyText,
          initial_message: docInitial.initial_message,
          initial_suggestions: docInitial.initial_suggestions,
        },
        contextText: copyText,
      };
    } else {
      const docTitle = analysis?.documentType || title || 'Document Analysis';
      const summary = analysis?.summary || '';
      const contextText = summary ? `${docTitle}\n\n${summary.slice(0, 300)}${summary.length > 300 ? '...' : ''}` : docTitle;
      context = {
        source: 'details',
        type: 'document',
        title: docTitle,
        ref: analysis?.id || `doc-${(analysis?.documentType || 'doc').replace(/\s+/g, '-').slice(0, 30)}`,
        data: {
          summary,
          documentType: analysis?.documentType,
          redFlags: analysis?.redFlags,
          analysisId: analysis?.id,
          contextText,
          initial_message: docInitial.initial_message,
          initial_suggestions: docInitial.initial_suggestions,
        },
        contextText,
      };
    }
    try {
      const analysisIdForChat = analysis?.id ?? null;
      const existing = analysisIdForChat ? await getChatByAnalysisId(user.id, analysisIdForChat) : null;
      if (existing) {
        setCurrentChatId(existing.id);
        setChatContext(context);
        setRefreshChatTrigger((p) => p + 1);
        navigation.navigate('Chat');
        return;
      }
      const chatContextForDb = {
        context_type: context.type,
        context_title: context.title,
        context_data: context.data ?? context,
      };
      const created = await createChat(user.id, context.title, chatContextForDb, analysisIdForChat);
      await addChatMessage(created.id, 'assistant', docInitial.initial_message);
      setCurrentChatId(created.id);
      setChatContext(context);
      setRefreshChatTrigger((p) => p + 1);
      navigation.navigate('Chat');
    } catch (_) {}
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      // Резерв места под кнопку; сама кнопка рендерится overlay’ем ниже — так она не растягивается App Bar (как на Upload File).
      headerRight: () => (
        <View style={styles.menuButtonWrap}>
          <MenuView onPressAction={handleMenuAction} actions={menuActions} themeVariant={isDarkMode ? 'dark' : 'light'} style={styles.menuButtonWrap}>
            <NativeHeaderButtonEllipsis iconSize={24} />
          </MenuView>
        </View>
      ),
      headerRightContainerStyle: { width: 44, height: 44, maxWidth: 44, maxHeight: 44, flexGrow: 0, flexShrink: 0 },
    });
  }, [navigation, menuActions, colors, isDarkMode]);

  const filteredIssues =
    activeFilter === 'all'
      ? redFlags
      : redFlags.filter((item) => item.type === activeFilter);

  const isCurrentAnalysis = analysis?.id === analysisId;
  if (analysisId && (!isCurrentAnalysis || loading)) {
    return (
      <View style={styles.container}>
        <SkeletonDetails />
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
        {/* [0] Summary card — scrolls away */}
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
              <Text style={styles.summaryDate}>{formatDateShort(analysis?.createdAt) || ''}</Text>
            </View>
          </View>
        </View>

        {/* [1] Tab bar — sticky (stays below header when scrolling) */}
        <View style={styles.tabBarSticky}>
          <DraggableSegmentedControl
            activeIndex={activeTab}
            onIndexChange={handleTabPress}
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
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}
                    onPress={() => setActiveFilter(f.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                    <View
                      style={[
                        styles.filterCount,
                        isActive && styles.filterCountActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterCountText,
                          isActive && styles.filterCountTextActive,
                        ]}
                      >
                        {f.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* [2] Tab content — scrolls with main scroll */}
        <View style={styles.tabContent}>
          {activeTab === 0 && (
            <View style={styles.scrollContent}>
              <SummaryContent analysis={analysis} jurisdictionCode={profile?.jurisdiction_code || 'US'} onJurisdictionEdit={() => navigation.navigate('Jurisdiction')} hideJurisdiction styles={styles} />
            </View>
          )}
          {activeTab === 1 && (
            <View style={[styles.scrollContent, filteredIssues.length === 0 && styles.scrollContentRedFlagsEmpty]}>
              {filteredIssues.length === 0 ? (
                <RedFlagsEmpty styles={styles} colors={colors} t={t} />
              ) : (
                <View style={styles.cardList}>
                  {filteredIssues.map((item) => (
                    <IssueCard
                      key={item.id}
                      item={item}
                      onAskAi={() => handleAskAI(item)}
                      askAiLabel={t('details.askAi')}
                      copyTextLabel={t('details.copyText')}
                      styles={styles}
                      issueTypeConfig={issueTypeConfig}
                      colors={colors}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
          {activeTab === 2 && (
            <View style={[styles.scrollContent, guidance.length === 0 && styles.scrollContentGuidanceEmpty]}>
              {guidance.length === 0 ? (
                <GuidanceEmpty styles={styles} colors={colors} t={t} />
              ) : (
                <View style={styles.cardList}>
                  {guidance.map((item) => (
                    <GuidanceCard key={item.id} item={item} onToggleDone={handleGuidanceToggle} showCheckbox styles={styles} severityConfig={severityConfig} colors={colors} />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity style={styles.askButton} activeOpacity={0.85} onPress={() => handleAskAI()}>
          <Sparkles size={20} color="#ffffff" strokeWidth={2} />
          <Text style={styles.askButtonText}>{t('common.askAiLawyer')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return {
  container: {
    flex: 1,
    backgroundColor: colors.primaryBackground,
  },
  menuButtonWrap: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    maxWidth: 44,
    maxHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Main vertical scroll */
  mainScroll: {
    flex: 1,
    minHeight: 0,
  },
  mainScrollContent: {
    paddingBottom: 100,
  },
  /* Top section: summary card only */
  fixedTop: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  /* Sticky tab bar (Summary | Red Flags | Guidance) */
  tabBarSticky: {
    backgroundColor: colors.primaryBackground,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 16,
  },
  tabContent: {
    paddingBottom: spacing.md,
  },
  /* Summary card */
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tertiary,
    padding: 14,
    gap: spacing.md,
    alignItems: 'flex-start',
    marginHorizontal: spacing.md,
  },
  scoreRing: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingSvg: {
    position: 'absolute',
  },
  scoreRingTextWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
  },
  summaryInfo: {
    flex: 1,
    gap: 8,
  },
  summaryTitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 24,
  },
  summaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCritical: {
    backgroundColor: colors.accent3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeCriticalText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
  },
  badgeWarning: {
    backgroundColor: colors.accent4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeWarningText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.warning,
  },
  summaryDate: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryText,
    lineHeight: 20,
  },
  /* Segmented control (iOS-style: height 42, radius 12/9, draggable indicator) */
  segmentContainer: {
    flexDirection: 'row',
    height: SEGMENT_HEIGHT,
    borderRadius: SEGMENT_RADIUS,
    padding: SEGMENT_PADDING,
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: spacing.md,
    backgroundColor: colors.tertiary,
  },
  segmentIndicator: {
    position: 'absolute',
    top: SEGMENT_PADDING,
    left: SEGMENT_PADDING,
    bottom: SEGMENT_PADDING,
    backgroundColor: colors.secondaryBackground,
    borderRadius: INDICATOR_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  /* Red Flags filter chips */
  filtersScrollWrap: {
    marginTop: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    backgroundColor: colors.tertiary,
    borderRadius: 32,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterChipText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterCount: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(26,26,26,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  filterCountTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  cardList: {
    gap: 16,
  },
  /* Summary tab styles */
  sCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tertiary,
    padding: spacing.md,
    gap: 12,
  },
  sCardTitle: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    lineHeight: 24,
  },
  sCardBody: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    color: colors.secondaryText,
    lineHeight: 24,
  },
  showMoreLink: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    lineHeight: 24,
  },
  sLabelGroup: {
    gap: 2,
  },
  sLabel: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryText,
    lineHeight: 20,
  },
  sValue: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    lineHeight: 24,
    textAlign: 'left',
  },
  sRowList: {
    gap: 8,
  },
  sRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.alternate,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sRowLeft: {
    flex: 1,
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.secondaryText,
    lineHeight: 22,
  },
  sRowRight: {
    flex: 1,
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    lineHeight: 22,
    textAlign: 'right',
  },
  sRowRightRed: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.error,
    lineHeight: 22,
  },
  sPenaltiesSection: {
    gap: 12,
    paddingTop: 12,
  },
  sSubTitle: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    lineHeight: 24,
  },
  /* Timeline */
  timeline: {
    // no gap — rows manage their own spacing via paddingBottom
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 32,
  },
  timelineDotCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#eff6ff',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineDate: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 24,
  },
  timelineLabel: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryText,
    lineHeight: 20,
  },
  /* Jurisdiction */
  jurisdictionSection: {
    gap: 12,
  },
  jurisdictionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tertiary,
    padding: spacing.md,
    gap: 12,
  },
  jurisdictionInfo: {
    flex: 1,
    gap: 4,
  },
  jurisdictionCountry: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 24,
  },
  jurisdictionLaw: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryText,
    lineHeight: 20,
  },
  jurisdictionEdit: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    lineHeight: 20,
  },
  /* Issue cards (Red Flags) */
  issueCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tertiary,
    padding: spacing.md,
    gap: 12,
  },
  issueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  issueTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  issueTypeBadgeText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
  },
  issueSectionText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryText,
    lineHeight: 20,
  },
  issueTitle: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    lineHeight: 24,
  },
  issueTextBlock: {
    gap: 8,
  },
  issueSubLabel: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.secondaryText,
    lineHeight: 24,
  },
  issueSubLabelBlue: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    lineHeight: 24,
  },
  issueBodyText: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    color: colors.primaryText,
    lineHeight: 24,
  },
  issueDivider: {
    height: 1,
    backgroundColor: colors.tertiary,
  },
  issueActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  askAiSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  askAiSmallText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.alternate,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyButtonText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryText,
    lineHeight: 20,
  },
  /* Red Flags empty state */
  scrollContentRedFlagsEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 200,
  },
  redFlagsEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48 + 32,
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
  },
  redFlagsEmptyIconCard: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1,
    borderColor: colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  redFlagsEmptyTitle: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  redFlagsEmptyDescription: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
  },
  /* Guidance empty state */
  scrollContentGuidanceEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 200,
  },
  guidanceEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48 + 32,
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
  },
  guidanceEmptyIconCard: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1,
    borderColor: colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guidanceEmptyTitle: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  guidanceEmptyDescription: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
  },
  /* Guidance cards */
  guideCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tertiary,
    padding: spacing.md,
    gap: 8,
  },
  guideCardTop: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  guideCardTextDone: {
    textDecorationLine: 'line-through',
    color: colors.secondaryText,
  },
  guideCardText: {
    flex: 1,
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 24,
  },
  checkWrap: {
    paddingVertical: 3,
  },
  guideCardTags: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  sectionBadge: {
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  /* Bottom action */
  bottomAction: {
    paddingTop: 16,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  askButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 100,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  askButtonText: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  };
}

export {
  ScoreRing,
  SummaryContent,
  IssueCard,
  GuidanceCard,
  DraggableSegmentedControl,
  TABS_KEYS,
  FALLBACK,
  getNormalizedRedFlags,
  getRedFlagsFilters,
  RED_FLAGS_ITEMS,
  GUIDANCE_ITEMS,
  createStyles as detailsCreateStyles,
  getSeverityConfig,
  getIssueTypeConfig,
};
