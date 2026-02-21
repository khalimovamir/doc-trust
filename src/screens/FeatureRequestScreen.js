/**
 * AI Lawyer - Feature Request Screen
 * List from Supabase, upvote toggle, "Send your idea" -> SendIdea.
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
} from 'react-native';
import { ChevronLeft, ChevronUp, Plus } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { SkeletonFeatureCard } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { listFeatureRequests, getMyVotedIds, toggleVote } from '../lib/featureRequests';
import { formatDateWithTime } from '../lib/dateFormat';


const STATUS_KEY = { pending: 'statusPending', approved: 'statusApproved', rejected: 'statusRejected' };

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xl, gap: spacing.sm },
    centered: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },
    skeletonList: { gap: spacing.sm },
    errorText: { fontFamily, fontSize: 14, color: colors.error },
    emptyText: { fontFamily, fontSize: 14, color: colors.secondaryText, textAlign: 'center' },
    card: { flexDirection: 'row', backgroundColor: colors.secondaryBackground, borderRadius: 24, borderWidth: 1, borderColor: colors.tertiary, padding: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
    cardContent: { flex: 1, gap: spacing.xs },
    cardTitle: { fontFamily, fontSize: 16, fontWeight: '600', color: colors.primaryText },
    cardDescription: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, lineHeight: 20 },
    cardStatus: { fontFamily, fontSize: 12, fontWeight: '500', color: colors.primary },
    cardStatusRejected: { color: colors.error },
    cardDate: { fontFamily, fontSize: 12, fontWeight: '400', color: colors.secondaryText, opacity: 0.8 },
    upvotePlaceholder: { minWidth: 48 },
    upvoteBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.tertiary, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 48 },
    upvoteBtnActive: { borderColor: colors.primary, backgroundColor: colors.accent1 },
    upvoteCount: { fontFamily, fontSize: 14, fontWeight: '600', color: colors.primaryText, marginTop: 2 },
    footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.primaryBackground },
    sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, backgroundColor: colors.primary, borderRadius: 30, gap: spacing.xs },
    sendButtonText: { fontFamily, fontSize: 16, fontWeight: '500', color: '#ffffff' },
    limitReachedText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center' },
  };
}

export default function FeatureRequestScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myVotedIds, setMyVotedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votingId, setVotingId] = useState(null);

  const myRequestCount = requests.filter((r) => r.user_id === user?.id).length;
  const canSendIdea = myRequestCount < 2;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [list, voted] = await Promise.all([
        listFeatureRequests(),
        getMyVotedIds(user.id),
      ]);
      setRequests(list);
      setMyVotedIds(voted);
    } catch (e) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleBack = () => navigation.goBack();

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

  const handleUpvote = async (id) => {
    if (!user?.id || votingId) return;
    const item = requests.find((r) => r.id === id);
    if (item?.status !== 'approved') return;
    setVotingId(id);
    try {
      await toggleVote(id, user.id);
      const voted = await getMyVotedIds(user.id);
      setMyVotedIds(voted);
      const list = await listFeatureRequests();
      setRequests(list);
    } catch (_) {
      // keep previous state on error
    } finally {
      setVotingId(null);
    }
  };

  const handleSendIdea = () => navigation.navigate('SendIdea');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4].map((key) => (
              <SkeletonFeatureCard key={key} />
            ))}
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t('featureRequestScreen.noRequestsYet')}</Text>
          </View>
        ) : (
          requests.map((item) => {
            const isOwn = item.user_id === user?.id;
            const statusKey = item.status && STATUS_KEY[item.status];
            const showUpvote = item.status === 'approved';
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                  {isOwn && statusKey ? (
                    <Text style={[styles.cardStatus, item.status === 'rejected' && styles.cardStatusRejected]}>{t(`featureRequestScreen.${statusKey}`)}</Text>
                  ) : null}
                  <Text style={styles.cardDate}>{formatDateWithTime(item.created_at)}</Text>
                </View>
                {showUpvote ? (
                  <TouchableOpacity
                    style={[styles.upvoteBtn, myVotedIds.has(item.id) && styles.upvoteBtnActive]}
                    onPress={() => handleUpvote(item.id)}
                    activeOpacity={0.8}
                    disabled={votingId === item.id}
                  >
                    <ChevronUp
                      size={22}
                      color={myVotedIds.has(item.id) ? colors.primary : colors.primaryText}
                      strokeWidth={2}
                    />
                    <Text style={styles.upvoteCount}>{item.upvotes ?? 0}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.upvotePlaceholder} />
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {canSendIdea ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendIdea}
            activeOpacity={0.8}
          >
            <Plus size={22} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.sendButtonText}>{t('featureRequestScreen.sendYourIdea')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <Text style={styles.limitReachedText}>{t('featureRequestScreen.limitReached')}</Text>
        </View>
      )}
    </View>
  );
}

