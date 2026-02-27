/**
 * AI Lawyer - Chat Screen (Stack)
 * Header copied from DetailsScreen; menu opens clear-chat dialog.
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Platform, Alert, StyleSheet } from 'react-native';
import { MenuView } from '@react-native-menu/menu';
import { NativeHeaderButtonEllipsis } from '../components/NativeHeaderButton';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { useTheme } from '../theme';
import ChatView from '../components/ChatView';
import { deleteChat, getChatMessages, getChat } from '../lib/chat';
import { exportChatHistoryToPdf } from '../lib/exportPdf';

export default function ChatScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDarkMode } = useTheme();
  const { chatPrompt, chatContext, currentChatId, setRefreshChatTrigger, clearChat } = useAILawyerChat();
  const currentChatIdRef = useRef(currentChatId);
  currentChatIdRef.current = currentChatId;
  const setRefreshChatTriggerRef = useRef(setRefreshChatTrigger);
  setRefreshChatTriggerRef.current = setRefreshChatTrigger;

  const chatMenuActions = useMemo(
    () => [
      {
        id: 'export',
        title: t('aiLawyer.exportHistory'),
        ...(Platform.OS === 'ios' && { image: 'square.and.arrow.up', imageColor: colors.primaryText }),
      },
      {
        id: 'clear',
        title: t('aiLawyer.clearChat'),
        attributes: { destructive: true },
        ...(Platform.OS === 'ios' && { image: 'trash', imageColor: '#ff3b30' }),
      },
    ],
    [t, colors.primaryText]
  );

  const handleMenuAction = ({ nativeEvent }) => {
    const chatId = currentChatIdRef.current;
    if (nativeEvent.event === 'export' && chatId) {
      (async () => {
        try {
          const [chat, msgs] = await Promise.all([getChat(chatId), getChatMessages(chatId)]);
          const title = chat?.title || chat?.context_title || 'Chat';
          await exportChatHistoryToPdf(msgs || [], {
            chatTitle: title,
            dialogTitle: t('aiLawyer.exportHistory'),
          });
        } catch (_) {
          Alert.alert(t('common.error'), t('details.exportFailed'));
        }
      })();
      return;
    }
    if (nativeEvent.event === 'clear' && chatId) {
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
                await deleteChat(chatId);
                clearChat();
                setRefreshChatTriggerRef.current((prev) => prev + 1);
                navigation.goBack();
              } catch (_) {}
            },
          },
        ]
      );
    }
  };

  const menuActionRef = useRef(() => {});
  menuActionRef.current = (eventId) => {
    if (eventId === 'export' && currentChatIdRef.current) {
      (async () => {
        try {
          const [chat, msgs] = await Promise.all([getChat(currentChatIdRef.current), getChatMessages(currentChatIdRef.current)]);
          const title = chat?.title || chat?.context_title || 'Chat';
          await exportChatHistoryToPdf(msgs || [], {
            chatTitle: title,
            dialogTitle: t('aiLawyer.exportHistory'),
          });
        } catch (_) {
          Alert.alert(t('common.error'), t('details.exportFailed'));
        }
      })();
      return;
    }
    if (eventId === 'clear' && currentChatIdRef.current) {
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
                await deleteChat(currentChatIdRef.current);
                clearChat();
                setRefreshChatTriggerRef.current((prev) => prev + 1);
                navigation.goBack();
              } catch (_) {}
            },
          },
        ]
      );
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('screens.aiLawyer'),
      headerStyle: { backgroundColor: colors.secondaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      // iOS: нативное меню — круглая кнопка, как на Details. Android: MenuView + headerRight.
      ...(Platform.OS === 'ios'
        ? {
            unstable_headerRightItems: () => [
              {
                type: 'menu',
                label: t('aiLawyer.exportHistory'),
                icon: { type: 'sfSymbol', name: 'ellipsis' },
                menu: {
                  title: '',
                  items: [
                    { type: 'action', label: t('aiLawyer.exportHistory'), icon: { type: 'sfSymbol', name: 'square.and.arrow.up' }, onPress: () => menuActionRef.current('export') },
                    { type: 'action', label: t('aiLawyer.clearChat'), icon: { type: 'sfSymbol', name: 'trash' }, destructive: true, onPress: () => menuActionRef.current('clear') },
                  ],
                },
              },
            ],
          }
        : {
            headerRight: () => (
              <View style={styles.menuButtonWrap}>
                <MenuView onPressAction={handleMenuAction} actions={chatMenuActions} themeVariant={isDarkMode ? 'dark' : 'light'} style={styles.menuButtonWrap}>
                  <NativeHeaderButtonEllipsis iconSize={24} />
                </MenuView>
              </View>
            ),
            headerRightContainerStyle: { width: 44, height: 44, maxWidth: 44, maxHeight: 44, flexGrow: 0, flexShrink: 0, justifyContent: 'center', alignItems: 'center', paddingRight: 16 },
          }),
    });
  }, [navigation, t, chatMenuActions, colors, isDarkMode]);

  return (
    <View style={styles.container}>
      <ChatView chatPrompt={chatPrompt} chatContext={chatContext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menuButtonWrap: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    maxWidth: 44,
    maxHeight: 44,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
