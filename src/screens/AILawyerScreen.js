/**
 * AI Lawyer - AI Agent Screen
 * Shows Start Chat when no active chat, shows chat UI when chat is active
 */

import React, { useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  EllipsisVertical,
  MessageCircleQuestion,
} from 'lucide-react-native';
import { MenuView } from '@react-native-menu/menu';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { useAILawyerTab } from '../context/AILawyerTabContext';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { useAuth } from '../context/AuthContext';
import { createChat, addChatMessage, getMostRecentChat } from '../lib/chat';
import ChatView, { ASSISTANT_GREETING } from '../components/ChatView';

const QUICK_PROMPT_KEYS = ['aiLawyer.prompt1', 'aiLawyer.prompt2', 'aiLawyer.prompt3', 'aiLawyer.prompt4'];

/* ── Main screen ── */

export default function AILawyerScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { setInChat, lastVisitedTabRef } = useAILawyerTab();
  const startStyles = useMemo(() => StyleSheet.create(createStartStyles(colors)), [colors]);
  const chatStyles = useMemo(() => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.secondaryBackground } }), [colors]);
  const chatMenuActions = useMemo(
    () => [
      {
        id: 'clear',
        title: t('aiLawyer.clearChat'),
        attributes: { destructive: true },
        ...(Platform.OS === 'ios' && { image: 'trash', imageColor: '#ff3b30' }),
      },
    ],
    [t]
  );
  const quickPrompts = QUICK_PROMPT_KEYS.map((key) => t(key));
  const { user } = useAuth();
  const {
    hasChat,
    setHasChat,
    chatPrompt,
    chatContext,
    setChatPrompt,
    setCurrentChatId,
    currentChatId,
    setRefreshChatTrigger,
  } = useAILawyerChat();
  const chatFadeAnim = useRef(new Animated.Value(0)).current;

  // Читаем ref в момент нажатия — он обновлён при фокусе на Home/History/Settings
  const goBack = React.useCallback(() => {
    const tab = lastVisitedTabRef?.current || 'HomeTab';
    navigation.navigate(tab);
  }, [navigation, lastVisitedTabRef]);

  useEffect(() => {
    setInChat(hasChat || !!currentChatId);
  }, [hasChat, currentChatId, setInChat]);

  useEffect(() => {
    if (hasChat || currentChatId) {
      chatFadeAnim.setValue(0);
      Animated.timing(chatFadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [hasChat, currentChatId]);

  // When opening AI Lawyer tab: if user has chats in Supabase but no active chat in state, open the most recent
  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id || hasChat || currentChatId) return;
      getMostRecentChat(user.id)
        .then((chat) => {
          if (chat?.id) {
            setCurrentChatId(chat.id);
            setHasChat(true);
          }
        })
        .catch(() => {});
    }, [user?.id, hasChat, currentChatId, setCurrentChatId, setHasChat])
  );

  const handleStartChat = async (prompt = '') => {
    if (prompt) {
      setChatPrompt(prompt);
      setHasChat(true);
      return;
    }
    if (!user?.id) return;
    try {
      const created = await createChat(user.id, 'New chat', null);
      await addChatMessage(created.id, 'assistant', ASSISTANT_GREETING);
      setCurrentChatId(created.id);
      setHasChat(true);
    } catch (_) {}
  };

  const handleClearChat = React.useCallback(async () => {
    if (!currentChatId) return;
    try {
      const { deleteMessagesExceptFirst } = await import('../lib/chat');
      await deleteMessagesExceptFirst(currentChatId);
      setRefreshChatTrigger((p) => p + 1);
    } catch (_) {}
  }, [currentChatId, setRefreshChatTrigger]);

  const handleMenuAction = ({ nativeEvent }) => {
    if (nativeEvent.event === 'clear' && currentChatId) {
      Alert.alert(
        t('aiLawyer.clearChatTitle'),
        t('aiLawyer.clearChatMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('aiLawyer.clearChatConfirm'), style: 'destructive', onPress: handleClearChat },
        ]
      );
    }
  };

  const parentNavigation = navigation.getParent();

  const applyHeaderOptions = React.useCallback(() => {
    if (!parentNavigation) return;
    parentNavigation.setOptions({
      headerShown: true,
      title: 'AI Lawyer',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.secondaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerBackVisible: false,
      headerLeft: () => (
        <IconButton icon={ChevronLeft} onPress={goBack} size={36} iconSize={22} />
      ),
      headerRight: () => (
        <MenuView onPressAction={handleMenuAction} actions={chatMenuActions}>
          <IconButton icon={EllipsisVertical} size={36} iconSize={20} />
        </MenuView>
      ),
    });
  }, [parentNavigation, goBack, chatMenuActions, colors]);

  const hideHeader = React.useCallback(() => {
    if (!parentNavigation) return;
    parentNavigation.setOptions({
      headerShown: false,
      headerLeft: undefined,
      headerRight: undefined,
    });
  }, [parentNavigation]);

  useLayoutEffect(() => {
    if (hasChat || currentChatId) {
      applyHeaderOptions();
    } else {
      hideHeader();
    }
  }, [hasChat, currentChatId, applyHeaderOptions, hideHeader]);

  useFocusEffect(
    React.useCallback(() => {
      if (hasChat || currentChatId) applyHeaderOptions();
      return hideHeader;
    }, [hasChat, currentChatId, applyHeaderOptions, hideHeader])
  );

  if (hasChat || currentChatId) {
    return (
      <Animated.View
        style={[
          chatStyles.container,
          { paddingBottom: tabBarHeight },
          { opacity: chatFadeAnim },
        ]}
      >
        <ChatView chatPrompt={chatPrompt} chatContext={chatContext} />
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={[startStyles.container, { paddingBottom: tabBarHeight }]} edges={['top']}>
      <ScrollView
        style={startStyles.scroll}
        contentContainerStyle={startStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={startStyles.heroSection}>
          <Image
            source={require('../../assets/ai-lawyer-logo.png')}
            style={startStyles.avatar}
            resizeMode="contain"
          />
          <Text style={startStyles.title}>{t('aiLawyer.expertTitle')}</Text>
          <Text style={startStyles.subtitle}>
            {t('aiLawyer.expertSubtitle')}
          </Text>
          <TouchableOpacity
            style={startStyles.startButton}
            activeOpacity={0.8}
            onPress={() => handleStartChat('')}
          >
            <Text style={startStyles.startButtonText}>{t('aiLawyer.startChat')}</Text>
          </TouchableOpacity>
        </View>

        <View style={startStyles.promptsSection}>
          <Text style={startStyles.promptsTitle}>{t('aiLawyer.quickPrompts')}</Text>
          <View style={startStyles.promptsList}>
            {quickPrompts.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={startStyles.promptCard}
                activeOpacity={0.8}
                onPress={() => handleStartChat(prompt)}
              >
                <MessageCircleQuestion size={24} color={colors.secondaryText} strokeWidth={2} />
                <Text style={startStyles.promptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles: Start Chat view (theme-aware) ── */

function createStartStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.secondaryBackground },
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 56, paddingBottom: spacing.xl },
    heroSection: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    avatar: { width: 80, height: 80, marginBottom: spacing.xl },
    title: {
      fontFamily,
      fontSize: 24,
      fontWeight: '500',
      color: colors.primaryText,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    startButton: {
      width: '100%',
      height: 48,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.accent1,
      borderWidth: 1,
      borderColor: colors.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startButtonText: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.primary },
    promptsSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    promptsTitle: {
      fontFamily,
      fontSize: 16,
      fontWeight: '500',
      color: colors.primaryText,
      marginBottom: spacing.sm,
    },
    promptsList: { gap: spacing.xs },
    promptCard: {
      height: 52,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.alternate,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    promptText: {
      flex: 1,
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      color: colors.secondaryText,
    },
  };
}
