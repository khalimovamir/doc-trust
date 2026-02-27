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
  Alert,
  Platform,
} from 'react-native';
import { MenuView } from '@react-native-menu/menu';
import { ChevronUp, Plus, Lightbulb, MoreVertical } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { SkeletonFeatureCard } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { listFeatureRequests, getMyVotedIds, toggleVote, deleteFeatureRequest } from '../lib/featureRequests';
import { formatDateWithTime } from '../lib/dateFormat';


const STATUS_KEY = { pending: 'statusPending', approved: 'statusApproved', rejected: 'statusRejected' };

function FeatureRequestEmpty({ styles, colors, t }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCard}>
        <Lightbulb size={28} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>{t('featureRequestScreen.emptyTitle')}</Text>
      <Text style={styles.emptyDescription}>{t('featureRequestScreen.emptyDescription')}</Text>
    </View>
  );
}

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xl, gap: spacing.sm },
    scrollContentEmpty: { flexGrow: 1 },
    centered: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },
    skeletonList: { gap: 12 },
    skeletonCardItem: { marginBottom: 0 },
    errorText: { fontFamily, fontSize: 14, color: colors.error },
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
    card: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor: colors.secondaryBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingLeft: 16,
      paddingTop: 18,
      paddingRight: 14,
      paddingBottom: 18,
      gap: 12,
      alignItems: 'flex-start',
    },
    cardContent: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'stretch',
      gap: 10,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: 12,
    },
    cardTitle: {
      flex: 1,
      fontFamily,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 22,
      color: colors.primaryText,
      letterSpacing: 0,
    },
    cardDate: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: colors.secondaryText,
      letterSpacing: 0,
    },
    cardStatus: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: colors.primary,
      letterSpacing: 0,
    },
    cardStatusRejected: { color: colors.error },
    cardIdeaRow: { flexDirection: 'row', alignSelf: 'stretch' },
    cardDescription: {
      flex: 1,
      fontFamily,
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      color: colors.primaryText,
      letterSpacing: 0,
    },
    cardMenuIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
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
      setRequests(Array.isArray(list) ? list : []);
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
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
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
      setRequests(Array.isArray(list) ? list : []);
    } catch (_) {
      // keep previous state on error
    } finally {
      setVotingId(null);
    }
  };

  const handleSendIdea = () => navigation.navigate('SendIdea');

  const handleDeleteRequest = (id, title) => {
    Alert.alert(
      t('featureRequestScreen.deleteTitle'),
      t('featureRequestScreen.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('featureRequestScreen.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await deleteFeatureRequest(id, user.id);
              setRequests((prev) => prev.filter((r) => r.id !== id));
            } catch (_) {
              // keep list on error
            }
          },
        },
      ]
    );
  };

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
              <SkeletonFeatureCard key={key} style={styles.skeletonCardItem} />
            ))}
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={[styles.scrollContent, styles.scrollContentEmpty]}>
            <FeatureRequestEmpty styles={styles} colors={colors} t={t} />
          </View>
        ) : (
          requests.map((item) => {
            const isOwn = item.user_id === user?.id;
            const statusKey = item.status && STATUS_KEY[item.status];
            const showUpvote = item.status === 'approved';
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                    {isOwn && item.status !== 'approved' ? (
                      <MenuView
                        onPressAction={({ nativeEvent }) => {
                          if (nativeEvent.event === 'delete') handleDeleteRequest(item.id, item.title);
                        }}
                        actions={[
                          { id: 'delete', title: t('featureRequestScreen.deleteRequest'), attributes: { destructive: true } },
                        ]}
                        shouldOpenOnLongPress={false}
                      >
                        <TouchableOpacity style={styles.cardMenuIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MoreVertical size={24} color={colors.primaryText} strokeWidth={2} />
                        </TouchableOpacity>
                      </MenuView>
                    ) : null}
                  </View>
                  <Text style={styles.cardDate}>{formatDateWithTime(item.created_at)}</Text>
                  {isOwn && statusKey ? (
                    <Text style={[styles.cardStatus, item.status === 'rejected' && styles.cardStatusRejected]}>{t(`featureRequestScreen.${statusKey}`)}</Text>
                  ) : null}
                  <View style={styles.cardIdeaRow}>
                    <Text style={styles.cardDescription} numberOfLines={2} ellipsizeMode="tail">{item.description}</Text>
                  </View>
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
                ) : null}
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

