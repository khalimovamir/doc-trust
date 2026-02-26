/**
 * Doc Trust - Shared Chat View
 * Persists to Supabase (chats, chat_messages), calls Gemini for replies
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  Easing,
} from 'react-native';
import { Paperclip, SendHorizontal, X, FileText, Scale, Shield } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, fontFamily, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useAILawyerChat } from '../context/AILawyerChatContext';
import { chat as chatApi } from '../lib/ai';
import { getAppLanguageCode } from '../i18n';
import * as ImagePicker from 'expo-image-picker';
import {
  createChat,
  getChat,
  getMostRecentChat,
  getChatMessages,
  addChatMessage,
  updateChatTitle,
  uploadChatImage,
} from '../lib/chat';

export const ASSISTANT_GREETING = 'Hello! How can I help you with law and legal issues?';
const DEFAULT_SUGGESTIONS = [
  { icon: Scale, text: 'What does this clause really mean?' },
  { icon: FileText, text: 'Is this contract safe to sign?' },
  { icon: Shield, text: 'Spot any legal risks here?' },
];

function formatTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function distance(p1, p2) {
  return Math.hypot(p2.pageX - p1.pageX, p2.pageY - p1.pageY);
}

/**
 * Full-screen image viewer with pinch-to-zoom and pan (drag to move when zoomed).
 * Top bar with close button is always visible.
 */
function ImageViewerModal({ uri, onClose, styles }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const baseScale = useRef(1);
  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);
  const initialDist = useRef(null);
  const scaleAtPinchStart = useRef(1);
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    baseScale.current = 1;
    baseTranslateX.current = 0;
    baseTranslateY.current = 0;
  }, [uri]);

  useEffect(() => {
    const subScale = scale.addListener(({ value }) => { baseScale.current = value; });
    const subTx = translateX.addListener(({ value }) => { baseTranslateX.current = value; });
    const subTy = translateY.addListener(({ value }) => { baseTranslateY.current = value; });
    return () => {
      scale.removeListener(subScale);
      translateX.removeListener(subTx);
      translateY.removeListener(subTy);
    };
  }, [scale, translateX, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.numberActiveTouches >= 1,
      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          initialDist.current = distance(touches[0], touches[1]);
          scaleAtPinchStart.current = baseScale.current;
        } else if (touches.length === 1) {
          startX.current = touches[0].pageX;
          startY.current = touches[0].pageY;
        }
      },
      onPanResponderMove: (e) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2 && initialDist.current > 0) {
          const d = distance(touches[0], touches[1]);
          const newScale = (scaleAtPinchStart.current * d) / initialDist.current;
          const s = Math.max(0.5, Math.min(4, Number.isNaN(newScale) ? 1 : newScale));
          scale.setValue(s);
        } else if (touches.length === 1) {
          const dx = touches[0].pageX - startX.current;
          const dy = touches[0].pageY - startY.current;
          translateX.setValue(baseTranslateX.current + dx);
          translateY.setValue(baseTranslateY.current + dy);
          startX.current = touches[0].pageX;
          startY.current = touches[0].pageY;
        }
      },
      onPanResponderRelease: (e) => {
        if (e.nativeEvent.touches.length === 0) {
          initialDist.current = null;
        }
      },
    })
  ).current;

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.imageViewerBackdrop} {...panResponder.panHandlers}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.imageViewerCenter]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.imageViewerImageWrap,
              {
                transform: [{ scale }, { translateX }, { translateY }],
              },
            ]}
          >
            <Image source={{ uri }} style={styles.imageViewerImage} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
        <View style={styles.imageViewerCloseWrap}>
          <TouchableOpacity
            style={styles.imageViewerCloseBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <X size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const LOADING_DOT_COLORS = ['#3b82f6', '#38a010', '#8b5cf6', '#ea580c', '#ef4444']; // blue, green, violet, amber, error

/**
 * Loading indicator while AI is replying: subtle avatar pulse + five colored dots,
 * calm animation, no card background behind dots.
 */
function AILoadingIndicator({ styles }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const dot4 = useRef(new Animated.Value(0)).current;
  const dot5 = useRef(new Animated.Value(0)).current;
  const dots = [dot1, dot2, dot3, dot4, dot5];
  const pulse = useRef(new Animated.Value(1)).current;
  const easeOut = Easing.bezier(0.33, 1, 0.68, 1);
  const staggerMs = 100;

  useEffect(() => {
    const runners = dots.map((anim, i) => {
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.delay(i * staggerMs),
          Animated.timing(anim, {
            toValue: 1,
            duration: 520,
            easing: easeOut,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 520,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );
      bounce.start();
      return bounce;
    });
    return () => runners.forEach((r) => r.stop());
  }, [dot1, dot2, dot3, dot4, dot5]);

  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    p.start();
    return () => p.stop();
  }, [pulse]);

  const dotTranslate = (anim) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const dotOpacity = (anim) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const dotScale = (anim) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.06] });

  return (
    <View style={styles.assistantBlock}>
      <Animated.View style={[styles.assistantAvatar, { transform: [{ scale: pulse }] }]}>
        <Image
          source={require('../../assets/ai-lawyer-logo.png')}
          style={styles.assistantAvatarImage}
          resizeMode="cover"
        />
      </Animated.View>
      <View style={styles.assistantBubbleWrap}>
        <View style={styles.loadingBubble}>
          <View style={styles.loadingDotsRow}>
            {dots.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.loadingDot,
                  {
                    backgroundColor: LOADING_DOT_COLORS[i],
                    opacity: dotOpacity(anim),
                    transform: [
                      { translateY: dotTranslate(anim) },
                      { scale: dotScale(anim) },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function AssistantBubble({ text, time, styles, colors }) {
  return (
    <View style={styles.assistantBlock}>
      <View style={styles.assistantAvatar}>
        <Image
          source={require('../../assets/ai-lawyer-logo.png')}
          style={styles.assistantAvatarImage}
          resizeMode="cover"
        />
      </View>
      <View style={styles.assistantBubbleWrap}>
        <View style={styles.assistantBubble}>
          <Text style={styles.assistantText}>{text}</Text>
          <View style={styles.assistantTimeWrap}>
            <Text style={styles.assistantTime}>{time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function formatMsgTime(dateStr) {
  if (!dateStr) return formatTime();
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (_) {
    return formatTime();
  }
}

export default function ChatView({ chatPrompt, chatContext }) {
  const { t } = useTranslation();
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors, isDarkMode)), [colors, isDarkMode]);
  const { user } = useAuth();
  const { currentChatId, setCurrentChatId, wasCleared, setChatContext, refreshChatTrigger } = useAILawyerChat();
  const [loadedChatContext, setLoadedChatContext] = useState(null);
  /** Document context text from loaded chat (context_data) — sent to API as relatedContext, not shown in UI */
  const [loadedDocumentContextText, setLoadedDocumentContextText] = useState(null);
  /** For document-linked chats: 3 short suggestion texts from context_data.initial_suggestions */
  const [loadedInitialSuggestions, setLoadedInitialSuggestions] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const [error, setError] = useState(null);
  const [contextSheetVisible, setContextSheetVisible] = useState(false);
  const [contextSheetText, setContextSheetText] = useState('');
  const [pendingImage, setPendingImage] = useState(null); // { uri, base64 } for preview and upload
  const [viewedImageUri, setViewedImageUri] = useState(null);
  const scrollRef = useRef(null);
  const sheetTranslateY = useRef(new Animated.Value(800)).current;

  const hasAutoSent = useRef(false);
  const sendRef = useRef(null);

  const pendingContextText = chatContext?.contextText ?? null;
  const getScreenHeight = () => {
    try {
      const h = Dimensions.get('window').height;
      const n = Number(h);
      return Number.isFinite(n) && n > 0 ? n : 800;
    } catch { return 800; }
  };
  const closeContextSheet = () => {
    Animated.timing(sheetTranslateY, {
      toValue: getScreenHeight(),
      duration: 220,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setContextSheetVisible(false);
    });
  };
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, g) => {
        const dy = Number(g.dy);
        sheetTranslateY.setValue(Math.max(0, Number.isNaN(dy) ? 0 : dy));
      },
      onPanResponderRelease: (_, g) => {
        const closeThreshold = 80;
        const velocityThreshold = 0.4;
        const dy = Number(g.dy);
        const vy = Number(g.vy);
        if (Number.isFinite(dy) && dy > closeThreshold) {
          closeContextSheet();
          return;
        }
        if (Number.isFinite(vy) && vy > velocityThreshold) {
          closeContextSheet();
          return;
        }
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: false,
          tension: 65,
          friction: 11,
        }).start();
      },
    })
  ).current;
  useEffect(() => {
    if (contextSheetVisible) {
      const h = getScreenHeight();
      sheetTranslateY.setValue(h);
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [contextSheetVisible]);
  const clearContextText = () => {
    if (chatContext && 'contextText' in chatContext) {
      const { contextText: _, ...rest } = chatContext;
      setChatContext(Object.keys(rest).length ? rest : null);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingImage({
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
      });
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLoadingChat(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const cid = currentChatId;
      if (cid) {
        const [chat, msgs] = await Promise.all([getChat(cid), getChatMessages(cid)]);
        if (!cancelled) {
          setLoadedChatContext(
            chat?.context_title
              ? { title: chat.context_title, ref: chat.context_data?.ref || chat.context_data?.issue?.id }
              : null
          );
          const ctxData = chat?.context_data;
          const docText = ctxData?.contextText ?? (ctxData?.summary ? `${ctxData.documentType || 'Document'}\n\n${ctxData.summary}` : null);
          setLoadedDocumentContextText(docText || null);
          setLoadedInitialSuggestions(Array.isArray(ctxData?.initial_suggestions) && ctxData.initial_suggestions.length >= 3 ? ctxData.initial_suggestions : null);
          setMessages(
            msgs.map((m) => ({
              id: m.id,
              role: m.role,
              text: m.content,
              time: formatMsgTime(m.created_at),
              imageUrl: m.image_url || undefined,
            }))
          );
        }
      } else if (!wasCleared) {
        const recent = await getMostRecentChat(user.id);
        if (!cancelled && recent) {
          setCurrentChatId(recent.id);
          const msgs = await getChatMessages(recent.id);
          if (!cancelled) {
            setLoadedChatContext(
              recent?.context_title
                ? { title: recent.context_title, ref: recent.context_data?.ref || recent.context_data?.issue?.id }
                : null
            );
            const ctxData = recent?.context_data;
            const docText = ctxData?.contextText ?? (ctxData?.summary ? `${ctxData.documentType || 'Document'}\n\n${ctxData.summary}` : null);
            setLoadedDocumentContextText(docText || null);
            setLoadedInitialSuggestions(Array.isArray(ctxData?.initial_suggestions) && ctxData.initial_suggestions.length >= 3 ? ctxData.initial_suggestions : null);
            setMessages(
              msgs.map((m) => ({
                id: m.id,
                role: m.role,
                text: m.content,
                time: formatMsgTime(m.created_at),
                imageUrl: m.image_url || undefined,
              }))
            );
          }
        } else {
          setLoadedChatContext(null);
          setLoadedDocumentContextText(null);
          setLoadedInitialSuggestions(null);
          setMessages([]);
          if (chatPrompt?.trim() && !cancelled) {
            const created = await createChat(user.id, 'New chat', null);
            await addChatMessage(created.id, 'assistant', ASSISTANT_GREETING);
            setCurrentChatId(created.id);
            setMessages([{ role: 'assistant', text: ASSISTANT_GREETING, time: formatTime() }]);
          }
        }
      } else {
        setLoadedChatContext(null);
        setLoadedDocumentContextText(null);
        setLoadedInitialSuggestions(null);
        setMessages([]);
      }
      if (!cancelled) setLoadingChat(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id, currentChatId, wasCleared, chatPrompt]);

  useEffect(() => {
    if (!currentChatId || !user?.id || refreshChatTrigger === 0) return;
    let cancelled = false;
    const refetch = async () => {
      const msgs = await getChatMessages(currentChatId);
      if (!cancelled) {
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role,
            text: m.content,
            time: formatMsgTime(m.created_at),
            imageUrl: m.image_url || undefined,
          }))
        );
      }
    };
    refetch();
    return () => { cancelled = true; };
  }, [refreshChatTrigger, currentChatId, user?.id]);

  const sendWithOptions = (text, forceNewChat = false) => {
    sendMessage(text, forceNewChat);
  };
  sendRef.current = sendWithOptions;
  useEffect(() => {
    if (chatPrompt?.trim() && !hasAutoSent.current && !loadingChat && !pendingContextText) {
      hasAutoSent.current = true;
      sendRef.current?.(chatPrompt.trim(), !currentChatId);
    } else if (!chatPrompt) {
      hasAutoSent.current = false;
    }
  }, [chatPrompt, loadingChat, pendingContextText, currentChatId]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const activeContext = chatContext || loadedChatContext;

  const sendMessage = async (text, forceNewChat = false) => {
    const trimmed = (text || inputText || '').trim();
    if (!trimmed || loading || !user?.id) return;
    setInputText('');
    const ctx = forceNewChat ? chatContext : activeContext;
    const contextTextToSend = pendingContextText || loadedDocumentContextText || null;
    if (pendingContextText) clearContextText();
    const imageToSend = pendingImage;
    if (imageToSend) setPendingImage(null);
    const userMsg = {
      role: 'user',
      text: trimmed,
      time: formatTime(),
      ...(imageToSend && { imageUrl: imageToSend.uri }),
    };
    const historyForApi = forceNewChat ? [userMsg] : [...messages, userMsg];
    setMessages((prev) => (forceNewChat ? [userMsg] : [...prev, userMsg]));
    setLoading(true);
    setError(null);
    try {
      let cid = forceNewChat ? null : currentChatId;
      if (!cid) {
        const chatContextForDb =
          ctx && ctx.source === 'details'
            ? {
                context_type: ctx.type,
                context_title: ctx.title,
                context_data: { ...ctx.data, ref: ctx.ref },
              }
            : null;
        const created = await createChat(user.id, trimmed.slice(0, 50), chatContextForDb);
        cid = created.id;
        setCurrentChatId(cid);
        if (ctx) setLoadedChatContext({ title: ctx.title, ref: ctx.ref });
        const greetingAdded = await addChatMessage(cid, 'assistant', ASSISTANT_GREETING);
        setMessages((prev) => [
          { id: greetingAdded.id, role: 'assistant', text: ASSISTANT_GREETING, time: formatTime() },
          ...prev,
        ]);
      } else {
        await updateChatTitle(cid, trimmed.slice(0, 50));
      }
      let imageUrl = null;
      if (imageToSend) {
        imageUrl = await uploadChatImage(user.id, cid, imageToSend.base64);
        setMessages((prev) =>
          prev.map((m, i) =>
            m.role === 'user' && m.time === userMsg.time && prev.length - 1 === i
              ? { ...m, imageUrl }
              : m
          )
        );
      }
      await addChatMessage(cid, 'user', trimmed, contextTextToSend, imageUrl);

      let historyForGemini = historyForApi.map((m) => ({ role: m.role, text: m.text }));
      if (forceNewChat && ctx?.data) {
        const hasDocInfo = ctx.data.summary != null || ctx.data.documentType != null;
        const docCtx =
          ctx.type === 'document'
            ? `\n[Document context: ${JSON.stringify(ctx.data)}]`
            : hasDocInfo
              ? `\n[Document context: ${JSON.stringify({ summary: ctx.data.summary, documentType: ctx.data.documentType, redFlags: ctx.data.redFlags })}]`
              : '';
        const issueCtx = ctx.data.issue ? `\n[Issue: ${JSON.stringify(ctx.data.issue)}]` : '';
        if (docCtx || issueCtx) {
          const last = historyForGemini[historyForGemini.length - 1];
          historyForGemini = [
            ...historyForGemini.slice(0, -1),
            { ...last, text: last.text + docCtx + issueCtx },
          ];
        }
      }
      const chatOptions = { language: getAppLanguageCode() };
      if (contextTextToSend) chatOptions.relatedContext = contextTextToSend;
      if (imageToSend?.base64) chatOptions.imageBase64 = imageToSend.base64;
      const reply = await chatApi(historyForGemini, chatOptions);
      const replyAdded = await addChatMessage(cid, 'assistant', reply);

      setMessages((prev) => [
        ...prev,
        { id: replyAdded.id, role: 'assistant', text: reply, time: formatTime() },
      ]);
    } catch (e) {
      setError(e?.message || 'Failed to get reply');
      if (imageToSend) {
        setPendingImage(imageToSend);
        setMessages((prev) => prev.slice(0, -1));
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Sorry, I could not respond. Please try again.', time: formatTime() },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onlyGreeting =
    messages.length === 1 && messages[0]?.role === 'assistant';
  const displayMessages =
    messages.length > 0 ? messages : [{ role: 'assistant', text: ASSISTANT_GREETING, time: formatTime() }];
  const suggestions =
    loadedInitialSuggestions && loadedInitialSuggestions.length >= 3
      ? DEFAULT_SUGGESTIONS.map((item, i) => ({ ...item, text: loadedInitialSuggestions[i] }))
      : DEFAULT_SUGGESTIONS;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {displayMessages.map((msg, i) =>
          msg.role === 'user' ? (
            <View key={i} style={styles.userBlock}>
              <View style={styles.userBubble}>
                {msg.imageUrl ? (
                  <TouchableOpacity
                    style={styles.msgImageWrap}
                    activeOpacity={1}
                    onPress={() => setViewedImageUri(msg.imageUrl)}
                  >
                    <Image source={{ uri: msg.imageUrl }} style={styles.msgImage} resizeMode="cover" />
                  </TouchableOpacity>
                ) : null}
                {(msg.text != null && msg.text !== '') ? (
                  <View style={styles.userTextWrap}>
                    <Text style={styles.userText}>{msg.text}</Text>
                  </View>
                ) : null}
                <View style={styles.userTimeWrap}>
                  <Text style={styles.userTime}>{msg.time}</Text>
                </View>
              </View>
            </View>
          ) : (
            <AssistantBubble
              key={msg.id || i}
              text={msg.text}
              time={msg.time}
              styles={styles}
              colors={colors}
            />
          )
        )}
        {loading && (
          <AILoadingIndicator styles={styles} />
        )}
        {(!displayMessages.length || onlyGreeting) && (
          <View style={styles.suggestionsList}>
            {suggestions.map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.text}
                  style={styles.suggestionChip}
                  activeOpacity={0.8}
                  onPress={() => sendMessage(item.text)}
                >
                  <Icon size={20} color={colors.secondaryText} strokeWidth={2} />
                  <Text style={styles.suggestionText}>{item.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={contextSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeContextSheet}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeContextSheet} />
        <Animated.View
          style={[
            styles.sheetColumn,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.sheetCloseRow}>
            <TouchableOpacity
              style={styles.sheetCloseIcon}
              onPress={closeContextSheet}
              activeOpacity={0.8}
            >
              <X size={24} color={colors.primaryText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetContent} {...sheetPanResponder.panHandlers}>
            <View style={styles.sheetDragHandle}>
              <View style={styles.sheetDragHandleBar} />
            </View>
            <View style={styles.sheetTextWrap} pointerEvents="none">
              <Text style={styles.sheetFullText}>{contextSheetText}</Text>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {pendingImage ? (
        <View style={styles.pendingImageWrap}>
          <View style={styles.pendingImageCard}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setViewedImageUri(pendingImage.uri)}
            >
              <Image
                source={{ uri: pendingImage.uri }}
                style={styles.pendingImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pendingImageClear}
              onPress={() => setPendingImage(null)}
              activeOpacity={0.8}
            >
              <X size={18} color="#ffffff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {viewedImageUri ? (
        <ImageViewerModal
          uri={viewedImageUri}
          onClose={() => setViewedImageUri(null)}
          styles={styles}
        />
      ) : null}

      <View style={styles.composerWrap}>
        <View style={styles.composerRow}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage} activeOpacity={0.8}>
            <Paperclip size={22} color={colors.secondaryText} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.composerStack}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={colors.secondaryText}
                multiline
                maxLength={2000}
                scrollEnabled={true}
                editable={!loading}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  inputText.trim() && styles.sendBtnFilled,
                  loading && styles.sendBtnDisabled,
                ]}
                activeOpacity={0.85}
                onPress={() => sendMessage()}
                disabled={loading || !inputText.trim()}
              >
                <SendHorizontal
                  size={24}
                  color={inputText.trim() ? '#ffffff' : colors.secondaryText}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

    </View>
  );
}

function createStyles(colors, isDarkMode) {
  return {
    container: { flex: 1, backgroundColor: colors.secondaryBackground },
    scroll: { flex: 1 },
    scrollContent: {
      paddingTop: 12,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    assistantBlock: { alignItems: 'flex-start', gap: spacing.xs },
    assistantAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      overflow: 'hidden',
    },
    assistantAvatarImage: { width: 32, height: 32, borderRadius: 16 },
    assistantBubbleWrap: { maxWidth: '82%', alignSelf: 'flex-start' },
    assistantBubble: {
      backgroundColor: colors.alternate,
      borderRadius: 20,
      padding: 14,
    },
    assistantText: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.primaryText },
    assistantTimeWrap: { paddingTop: 6, paddingRight: 0, paddingBottom: 2 },
    assistantTime: { fontFamily, fontSize: 12, fontWeight: '400', color: colors.secondaryText, textAlign: 'right' },
    userBlock: { width: '100%', alignItems: 'flex-end' },
    userBubble: {
      width: Dimensions.get('window').width * 0.72,
      maxWidth: '100%',
      borderRadius: 20,
      backgroundColor: isDarkMode ? colors.primary : colors.accent1,
      padding: 0,
    },
    msgContextCardWrap: {
      alignSelf: 'stretch',
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 8,
    },
    msgContextCard: {
      alignSelf: 'stretch',
      width: '100%',
      borderRadius: 12,
      padding: 12,
      marginBottom: 0,
      backgroundColor: isDarkMode ? '#ffffff' : colors.primary,
    },
    msgContextCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    msgContextCardText: {
      flex: 1,
      fontFamily,
      fontSize: 14,
      fontWeight: '400',
      color: isDarkMode ? '#000000' : '#ffffff',
      lineHeight: 20,
    },
    userTextWrap: {
      paddingTop: 10,
      paddingLeft: 14,
      paddingRight: 14,
    },
    userTimeWrap: {
      paddingTop: 6,
      paddingRight: 14,
      paddingBottom: 12,
    },
    msgContextBadge: {
      height: 28,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      justifyContent: 'center',
    },
  msgContextBadgeText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    color: '#ffffff',
  },
    pendingImageWrap: {
      paddingHorizontal: spacing.md,
      paddingTop: 12,
    },
    pendingImageCard: {
      height: 200,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.tertiary,
      backgroundColor: colors.alternate,
      overflow: 'hidden',
      position: 'relative',
    },
    pendingImage: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
    },
    pendingImageClear: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    msgImageWrap: {
      paddingTop: 8,
      paddingHorizontal: 8,
      paddingRight: 8,
    },
    msgImage: {
      width: '100%',
      height: 180,
      borderRadius: 10,
      backgroundColor: colors.tertiary,
    },
    imageViewerBackdrop: {
      flex: 1,
      backgroundColor: '#000000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageViewerCenter: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageViewerImageWrap: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
    },
    imageViewerImage: {
      width: '100%',
      height: '100%',
    },
    imageViewerCloseWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: Platform.OS === 'ios' ? 54 : 40,
      paddingBottom: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 10,
    },
    imageViewerCloseBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheetColumn: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 50,
      bottom: 0,
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    sheetCloseRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    sheetCloseIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryBackground,
      borderWidth: 1,
      borderColor: colors.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetContent: {
      flex: 1,
      backgroundColor: colors.secondaryBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      overflow: 'hidden',
    },
    sheetDragHandle: {
      paddingBottom: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 30,
    },
    sheetDragHandleBar: {
      width: 56,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.tertiary,
    },
    sheetTextWrap: { flex: 1, paddingBottom: 24 },
    sheetFullText: {
      fontFamily,
      fontSize: 16,
      fontWeight: '400',
      color: colors.primaryText,
      lineHeight: 24,
    },
    userText: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.primaryText },
    userTime: { fontFamily, fontSize: 12, fontWeight: '400', color: isDarkMode ? 'rgba(255,255,255,0.5)' : colors.secondaryText, textAlign: 'right' },
    loadingBubble: {
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: 'transparent',
      paddingVertical: 8,
      paddingLeft: 16,
      paddingRight: 0,
      borderRadius: 0,
    },
    loadingDotsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loadingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    suggestionsList: { gap: 10 },
    suggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 10,
      borderRadius: 100,
      backgroundColor: colors.primaryBackground,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    suggestionText: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '500', color: colors.primaryText },
    composerWrap: {
      paddingTop: 12,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.secondaryBackground,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    composerStack: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    },
    attachBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.alternate,
      borderWidth: 1,
      borderColor: colors.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      borderRadius: 26,
      backgroundColor: colors.alternate,
      borderWidth: 1,
      borderColor: colors.tertiary,
      overflow: 'hidden',
    },
    input: {
      flex: 1,
      fontFamily: fontFamily,
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 20,
      color: colors.primaryText,
      paddingLeft: 16,
      paddingTop: 16,
      paddingRight: 12,
      paddingBottom: 16,
      minHeight: 52,
      maxHeight: 52 + 5 * 20,
    },
    sendBtn: {
      width: 46,
      height: 46,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.tertiary,
      backgroundColor: colors.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 0,
      marginTop: 3,
      marginRight: 3,
      marginBottom: 3,
    },
    sendBtnFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    sendBtnDisabled: { opacity: 0.6 },
    errorText: { fontFamily, fontSize: 12, color: colors.error, marginTop: 4 },
  };
}
