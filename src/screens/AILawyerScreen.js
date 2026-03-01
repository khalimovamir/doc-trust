/**
 * AI Lawyer - Tab screen: empty state or chat list.
 * Empty state: icon, title, description, Start Chat, quick prompts.
 * With chats: list of chats (title, date, last message), Add new chat button.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuView } from '@react-native-menu/menu';
import { Plus, MessageCircleQuestion, MoreVertical } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useGuest } from '../context/GuestContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { useTheme, fontFamily, spacing, borderRadius, typography } from '../theme';
import {
  getChats,
  getChatLastMessage,
  createChat,
  addChatMessage,
  deleteChat,
} from '../lib/chat';
import {
  getGuestChats,
  getGuestChatLastMessage,
  createGuestChat,
  addGuestChatMessage,
  deleteGuestChat,
} from '../lib/guestChatStorage';
import { ASSISTANT_GREETING } from '../components/ChatView';
import { SkeletonChatCard } from '../components/Skeleton';
import { formatChatCardTime } from '../lib/dateFormat';

export default function AILawyerScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isGuest } = useGuest();
  const { openSubscriptionIfLimitReached } = useSubscription();
  const { setCurrentChatId, setChatContext, setChatPrompt, setRefreshChatTrigger } = useAILawyerChat();

  const [chats, setChats] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const isGuestUser = !user?.id || isGuest;

  const fetchChats = useCallback(async () => {
    if (isGuestUser) {
      setLoading(true);
      try {
        const list = await getGuestChats();
        setChats(list);
        const last = {};
        await Promise.all(
          list.map(async (c) => {
            const msg = await getGuestChatLastMessage(c.id);
            if (msg) last[c.id] = msg;
          })
        );
        setLastMessages(last);
      } catch (_) {
        setChats([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!user?.id) {
      setChats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getChats(user.id);
      setChats(list);
      const last = {};
      await Promise.all(
        list.map(async (c) => {
          const msg = await getChatLastMessage(c.id);
          if (msg) last[c.id] = msg;
        })
      );
      setLastMessages(last);
    } catch (_) {
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats])
  );

  const openChatScreen = () => {
    const root = navigation.getParent?.()?.getParent?.() ?? navigation.getParent?.();
    if (root?.navigate) root.navigate('Chat');
  };

  const handleStartChat = async (optionalPrompt = null) => {
    if ((!user?.id && !isGuest) || creating) return;
    const root = navigation.getParent?.()?.getParent?.() ?? navigation.getParent?.();
    if (!openSubscriptionIfLimitReached('ai_lawyer', root ?? navigation)) return;
    setCreating(true);
    try {
      if (isGuestUser) {
        const created = await createGuestChat('New chat', null);
        await addGuestChatMessage(created.id, 'assistant', ASSISTANT_GREETING);
        setCurrentChatId(created.id);
        setChatContext(null);
        setChatPrompt(optionalPrompt ?? '');
        setRefreshChatTrigger((p) => p + 1);
        setChats((prev) => [created, ...prev]);
        setLastMessages((prev) => ({ ...prev, [created.id]: { content: ASSISTANT_GREETING, created_at: created.created_at } }));
        openChatScreen();
      } else {
        const created = await createChat(user.id, 'New chat', null);
        await addChatMessage(created.id, 'assistant', ASSISTANT_GREETING);
        setCurrentChatId(created.id);
        setChatContext(null);
        setChatPrompt(optionalPrompt ?? '');
        setRefreshChatTrigger((p) => p + 1);
        openChatScreen();
      }
    } catch (_) {}
    setCreating(false);
  };

  const handleAddNewChat = () => {
    handleStartChat();
  };

  const handleOpenChat = (chat) => {
    const root = navigation.getParent?.()?.getParent?.() ?? navigation.getParent?.();
    if (!openSubscriptionIfLimitReached('ai_lawyer', root ?? navigation)) return;
    setCurrentChatId(chat.id);
    setChatContext(null);
    setRefreshChatTrigger((p) => p + 1);
    openChatScreen();
  };

  const handleDeleteChat = (chatId, chatTitle) => {
    Alert.alert(
      t('aiLawyer.deleteChatTitle'),
      t('aiLawyer.deleteChatMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('aiLawyer.deleteChatConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (isGuestUser) {
                await deleteGuestChat(chatId);
              } else {
                await deleteChat(chatId);
              }
              setChats((prev) => prev.filter((c) => c.id !== chatId));
              const next = { ...lastMessages };
              delete next[chatId];
              setLastMessages(next);
            } catch (_) {}
          },
        },
      ]
    );
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.primaryBackground },
        appBar: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: colors.primaryBackground,
        },
        headerTitle: {
          fontFamily,
          fontSize: 24,
          fontWeight: Platform.OS === 'android' ? '800' : '700',
          color: colors.primaryText,
        },
        content: { flex: 1, paddingHorizontal: spacing.md },
        contentEmpty: { flex: 1, paddingHorizontal: 16 },
        emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 16, paddingBottom: 32 },
        emptyTopBlock: { alignItems: 'center', marginBottom: 16 },
        emptyLogo: { width: 88, height: 88, marginBottom: spacing.lg },
        emptyTitle: {
          fontFamily,
          fontSize: 22,
          fontWeight: '700',
          color: colors.primaryText,
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        emptySubtitle: {
          fontFamily,
          fontSize: 15,
          color: colors.secondaryText,
          textAlign: 'center',
          lineHeight: 22,
          paddingHorizontal: spacing.lg,
        },
        emptyActionsWrap: { width: '100%', marginBottom: spacing.xl },
        startChatBtn: {
          height: 48,
          backgroundColor: colors.accent1,
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 16,
          marginBottom: 32,
        },
        startChatBtnText: {
          fontFamily,
          fontSize: 16,
          fontWeight: '600',
          color: colors.primary,
        },
        quickPromptsTitle: {
          fontFamily,
          fontSize: 16,
          fontWeight: '500',
          color: colors.primaryText,
          marginBottom: spacing.sm,
          textAlign: 'left',
        },
        promptCard: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 52,
          backgroundColor: colors.secondaryBackground,
          borderWidth: 1,
          borderColor: colors.tertiary,
          borderRadius: 16,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        promptIcon: { marginRight: spacing.sm },
        promptText: { fontFamily, fontSize: 15, color: colors.primaryText, flex: 1 },
        chatListWrap: { flex: 1 },
        listContent: { paddingTop: spacing.sm, paddingBottom: 24 },
        chatCard: {
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
        },
        chatCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
        chatCardCol: { flex: 1, alignItems: 'flex-start' },
        chatCardTitle: {
          ...typography.titleMedium,
          fontSize: 18,
          color: colors.primaryText,
          flex: 1,
        },
        chatCardMenuIcon: { marginTop: 2 },
        chatCardTime: {
          ...typography.labelSmall,
          fontSize: 14,
          fontWeight: '400',
          color: colors.secondaryText,
          marginTop: 10,
        },
        chatCardPreview: {
          ...typography.bodyLarge,
          color: colors.secondaryText,
          marginTop: 10,
        },
        addChatBtnWrap: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: Platform.OS === 'android' ? 100 + 12 : 100,
        },
        addChatBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 56,
          backgroundColor: colors.primary,
          borderRadius: 28,
          gap: 8,
        },
        addChatBtnText: { fontFamily, fontSize: 16, fontWeight: '600', color: '#ffffff' },
        loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        menuButtonWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
      }),
    [colors]
  );

  const hasChats = chats.length > 0;
  const showChatList = hasChats;
  const showStartChatPage = !loading && !hasChats;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {showChatList ? (
        <View style={styles.appBar}>
          <Text style={styles.headerTitle}>{t('screens.aiLawyer')}</Text>
        </View>
      ) : null}

      {loading && !hasChats ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : showStartChatPage ? (
        <ScrollView style={[styles.content, styles.contentEmpty]} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyCenter}>
            <View style={styles.emptyTopBlock}>
              <Image
                source={require('../../assets/ai-lawyer-logo.png')}
                style={styles.emptyLogo}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>{t('aiLawyer.expertTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('aiLawyer.expertSubtitle')}</Text>
            </View>
            <View style={styles.emptyActionsWrap}>
              <TouchableOpacity
                style={styles.startChatBtn}
                onPress={() => handleStartChat()}
                disabled={creating}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.startChatBtnText}>{t('aiLawyer.startChat')}</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.quickPromptsTitle}>{t('aiLawyer.quickPrompts')}</Text>
              {[1, 2, 3, 4].map((i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.promptCard}
                  onPress={() => handleStartChat(t(`aiLawyer.prompt${i}`))}
                  disabled={creating}
                  activeOpacity={0.7}
                >
                  <View style={styles.promptIcon}>
                    <MessageCircleQuestion size={20} color={colors.secondaryText} strokeWidth={2} />
                  </View>
                  <Text style={styles.promptText}>{t(`aiLawyer.prompt${i}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.chatListWrap}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 + 56 + spacing.md + (Platform.OS === 'android' ? 100 + 12 : 100) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              [1, 2, 3].map((key) => <SkeletonChatCard key={key} />)
            ) : (
              chats.map((chat) => {
            const last = lastMessages[chat.id];
            const preview = last?.content?.slice(0, 80) || '';
            const menuActions = [
              {
                id: 'delete',
                title: t('aiLawyer.deleteChat'),
                attributes: { destructive: true },
                ...(Platform.OS === 'ios' && { image: 'trash', imageColor: '#ff3b30' }),
              },
            ];
            return (
              <View key={chat.id} style={styles.chatCard}>
                <View style={styles.chatCardRow}>
                  <TouchableOpacity
                    style={styles.chatCardCol}
                    onPress={() => handleOpenChat(chat)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chatCardTitle} numberOfLines={1} ellipsizeMode="tail">
                      {chat.title || 'Chat'}
                    </Text>
                    <Text style={styles.chatCardTime}>{formatChatCardTime(chat.updated_at)}</Text>
                    {preview ? (
                      <Text style={styles.chatCardPreview} numberOfLines={2} ellipsizeMode="tail">
                        {preview}
                        {last?.content?.length > 80 ? '…' : ''}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                  <MenuView
                    onPressAction={({ nativeEvent }) => {
                      if (nativeEvent.event === 'delete') handleDeleteChat(chat.id, chat.title);
                    }}
                    actions={menuActions}
                    themeVariant={colors.primaryText === '#ffffff' ? 'dark' : 'light'}
                  >
                    <TouchableOpacity style={styles.chatCardMenuIcon} hitSlop={8}>
                      <MoreVertical size={24} color={colors.primaryText} strokeWidth={2} />
                    </TouchableOpacity>
                  </MenuView>
                </View>
              </View>
            );
          })
            )}
          </ScrollView>
          <View style={styles.addChatBtnWrap}>
            <TouchableOpacity
              style={styles.addChatBtn}
              onPress={handleAddNewChat}
              disabled={creating}
              activeOpacity={0.8}
            >
              <Plus size={22} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.addChatBtnText}>{t('aiLawyer.addNewChat')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
