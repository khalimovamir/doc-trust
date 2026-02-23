/**
 * AI Lawyer - Chat Screen (Stack)
 * Shown when navigating from Details (Ask AI) - back returns to Details
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Platform, Alert } from 'react-native';
import { MenuView } from '@react-native-menu/menu';
import { NativeHeaderButtonBack, NativeHeaderButtonMenuIcon } from '../components/NativeHeaderButton';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { useTheme } from '../theme';
import ChatView from '../components/ChatView';
import { deleteMessagesExceptFirst } from '../lib/chat';

export default function ChatScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { chatPrompt, chatContext, currentChatId, setRefreshChatTrigger } = useAILawyerChat();
  const currentChatIdRef = useRef(currentChatId);
  currentChatIdRef.current = currentChatId;
  const setRefreshChatTriggerRef = useRef(setRefreshChatTrigger);
  setRefreshChatTriggerRef.current = setRefreshChatTrigger;

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

  const handleMenuAction = ({ nativeEvent }) => {
    const chatId = currentChatIdRef.current;
    if (nativeEvent.event === 'clear' && chatId) {
      Alert.alert(
        t('aiLawyer.clearChatTitle'),
        t('aiLawyer.clearChatMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('aiLawyer.clearChatConfirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteMessagesExceptFirst(chatId);
                setRefreshChatTriggerRef.current((prev) => prev + 1);
              } catch (_) {}
            },
          },
        ]
      );
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      title: t('screens.aiLawyer'),
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.secondaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerLeft: () => (
        <NativeHeaderButtonBack onPress={() => navigation.goBack()} />
      ),
      headerRight: () => (
        <MenuView onPressAction={handleMenuAction} actions={chatMenuActions}>
          <NativeHeaderButtonMenuIcon />
        </MenuView>
      ),
    });
  }, [navigation, t, chatMenuActions, colors]);

  return <ChatView chatPrompt={chatPrompt} chatContext={chatContext} />;
}
