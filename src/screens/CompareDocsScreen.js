/**
 * AI Lawyer - Compare Docs Screen
 * Select two documents (pick or paste), then run comparison via Edge Function.
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { FileText, ArrowUpDown, X } from 'lucide-react-native';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { NativeHeaderButtonInfo } from '../components/NativeHeaderButton';
import { pickDocumentAndGetText } from '../lib/uploadDocument';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xxl },
    docArea: {
      minHeight: 140,
      borderRadius: borderRadius.xl,
      borderWidth: 2, borderStyle: 'dashed',
      borderColor: colors.tertiary,
      backgroundColor: colors.secondaryBackground,
      alignItems: 'center', justifyContent: 'center',
      padding: spacing.lg, marginBottom: 20,
    },
    docHint: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, marginTop: spacing.md },
    fileCard: {
      width: '100%', borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary,
      backgroundColor: colors.secondaryBackground,
      paddingTop: 16, paddingRight: 14, paddingBottom: 16, paddingLeft: 14,
      flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20,
    },
    fileCardIconWrap: { marginRight: 12, paddingTop: 2 },
    fileCardContent: { flex: 1, paddingRight: 12, minWidth: 0 },
    fileCardTitle: { fontFamily, fontSize: 16, fontWeight: '600', color: colors.primaryText, lineHeight: 24 },
    fileCardMeta: { marginTop: 10, fontFamily, fontSize: 12, fontWeight: '500', color: colors.secondaryText, lineHeight: 16 },
    fileCardClose: { padding: 4 },
    swapButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
      height: 36, borderRadius: 10, backgroundColor: colors.accent1,
      paddingHorizontal: 12, gap: 6, marginBottom: 20,
    },
    swapButtonText: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.primary },
    errorRow: { marginTop: spacing.sm },
    errorText: { fontFamily, fontSize: 14, color: colors.error },
    bottomAction: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
    compareButton: { height: 56, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    compareButtonDisabled: { opacity: 0.5 },
    compareButtonText: { fontFamily, fontSize: 16, fontWeight: '600', color: '#ffffff' },
  };
}

export default function CompareDocsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [doc1, setDoc1] = useState(null); // { text, fileName }
  const [doc2, setDoc2] = useState(null);
  const [loadingSlot, setLoadingSlot] = useState(null); // '1' | '2' | null
  const [error, setError] = useState('');
  const swapRotation = useRef(new Animated.Value(0)).current;

  // Pre-fill first document when opened from Details (Compare button)
  useFocusEffect(
    React.useCallback(() => {
      const text_content = route.params?.text_content;
      const title = route.params?.title;
      if (typeof text_content === 'string' && text_content.trim() && title) {
        setDoc1({ text: text_content.trim(), fileName: String(title) });
      }
    }, [route.params?.text_content, route.params?.title])
  );

  const handlePick = async (slot) => {
    setError('');
    setLoadingSlot(slot);
    try {
      const { text, fileName } = await pickDocumentAndGetText();
      if (slot === '1') setDoc1({ text, fileName });
      else setDoc2({ text, fileName });
    } catch (e) {
      if (e?.message === 'CANCELLED') return;
      setError(e?.message || t('compareDocs.errorLoadDocument'));
      if (slot === '1') setDoc1(null);
      else setDoc2(null);
    } finally {
      setLoadingSlot(null);
    }
  };

  const handleClear = (slot) => {
    if (slot === '1') setDoc1(null);
    else setDoc2(null);
    setError('');
  };

  const handleSwap = () => {
    setDoc1(doc2);
    setDoc2(doc1);
    setError('');
    swapRotation.setValue(0);
    Animated.timing(swapRotation, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const handleCompare = () => {
    if (!doc1?.text?.trim() || !doc2?.text?.trim()) {
      setError(t('compareDocs.errorSelectBoth'));
      return;
    }
    navigation.navigate('Comparing', {
      document1Text: doc1.text.trim(),
      document2Text: doc2.text.trim(),
      document1Name: doc1.fileName || t('compareDocs.original'),
      document2Name: doc2.fileName || t('compareDocs.revised'),
    });
  };

  const canCompare = doc1?.text?.trim() && doc2?.text?.trim();

  const handleInfoPress = () => {
    Alert.alert(
      t('compareDocs.infoDialogTitle'),
      t('compareDocs.infoDialogMessage'),
      [{ text: t('common.close') }]
    );
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      // iOS: нативная кнопка — круглая, как на Upload File. Android: headerRight.
      ...(Platform.OS === 'ios'
        ? {
            unstable_headerRightItems: () => [
              {
                type: 'button',
                label: '',
                icon: { type: 'sfSymbol', name: 'info.circle' },
                onPress: handleInfoPress,
              },
            ],
          }
        : {
            headerRight: () => <NativeHeaderButtonInfo onPress={handleInfoPress} iconSize={24} />,
            headerRightContainerStyle: {
              width: 44,
              height: 44,
              maxWidth: 44,
              maxHeight: 44,
              flexGrow: 0,
              flexShrink: 0,
              justifyContent: 'center',
              alignItems: 'center',
              paddingRight: 16,
            },
          }),
    });
  }, [navigation, colors, t]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!doc1 ? (
          <TouchableOpacity
            style={styles.docArea}
            activeOpacity={0.85}
            onPress={() => handlePick('1')}
            disabled={!!loadingSlot}
          >
            {loadingSlot === '1' ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <FileText size={32} color={colors.secondaryText} strokeWidth={1.5} />
                <Text style={styles.docHint}>{t('compareDocs.selectOriginal')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.fileCard}>
            <View style={styles.fileCardIconWrap}>
              <FileText size={24} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.fileCardContent}>
              <Text style={styles.fileCardTitle} numberOfLines={2} ellipsizeMode="tail">
                {doc1.fileName}
              </Text>
              <Text style={styles.fileCardMeta}>
                {doc1.text.trim().length.toLocaleString()} {t('compareDocs.characters')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fileCardClose}
              onPress={() => handleClear('1')}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={24} color={colors.primaryText} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.swapButton}
          onPress={handleSwap}
          activeOpacity={0.7}
          disabled={(!doc1 && !doc2)}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: swapRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}
          >
            <ArrowUpDown size={22} color={colors.primary} strokeWidth={2} />
          </Animated.View>
          <Text style={styles.swapButtonText}>{t('compareDocs.swap')}</Text>
        </TouchableOpacity>

        {!doc2 ? (
          <TouchableOpacity
            style={styles.docArea}
            activeOpacity={0.85}
            onPress={() => handlePick('2')}
            disabled={!!loadingSlot}
          >
            {loadingSlot === '2' ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <FileText size={32} color={colors.secondaryText} strokeWidth={1.5} />
                <Text style={styles.docHint}>{t('compareDocs.selectRevised')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.fileCard}>
            <View style={styles.fileCardIconWrap}>
              <FileText size={24} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.fileCardContent}>
              <Text style={styles.fileCardTitle} numberOfLines={2} ellipsizeMode="tail">
                {doc2.fileName}
              </Text>
              <Text style={styles.fileCardMeta}>
                {doc2.text.trim().length.toLocaleString()} {t('compareDocs.characters')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fileCardClose}
              onPress={() => handleClear('2')}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={24} color={colors.primaryText} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[styles.compareButton, !canCompare && styles.compareButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleCompare}
          disabled={!canCompare}
        >
          <Text style={styles.compareButtonText}>{t('compareDocs.compareButton')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

