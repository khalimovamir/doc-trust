/**
 * AI Lawyer - Paste Text Screen
 * Flutter-style field: contentPadding 16/18.5, minLines 6, scroll on column, error text.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ClipboardList } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import { useSubscription } from '../context/SubscriptionContext';
import IconButton from '../components/IconButton';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    keyboardView: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xl },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    label: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.primaryText },
    pasteButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pasteButtonText: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.secondaryText },
    fieldInput: {
      fontFamily, fontSize: 16, fontWeight: '400', lineHeight: 24,
      color: colors.primaryText,
      backgroundColor: colors.secondaryBackground,
      borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18.5,
      minHeight: 6 * 24 + 16 + 18.5,
    },
    fieldInputError: { borderColor: colors.error },
    errorText: { fontFamily, fontSize: 12, fontWeight: '400', color: colors.error, marginTop: 10, marginLeft: 16, marginBottom: 0, marginRight: 0, padding: 0 },
    bottomAction: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
    analyzeButton: { height: 56, borderRadius: 100, backgroundColor: colors.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    analyzeButtonText: { fontFamily, fontSize: 16, fontWeight: '500', color: '#ffffff' },
  };
}

export default function PasteTextScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { openSubscriptionIfLimitReached } = useSubscription();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [documentText, setDocumentText] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) setDocumentText((prev) => prev + (prev ? '\n\n' : '') + text);
      setFieldError('');
    } catch (_) {
      Alert.alert(t('pasteText.pasteFailed'), t('pasteText.couldNotReadClipboard'));
    }
  };

  const handleAnalyze = () => {
    const trimmed = documentText.trim();
    setFieldError('');
    if (!trimmed) {
      setFieldError(t('pasteText.errorEmpty'));
      return;
    }
    if (!openSubscriptionIfLimitReached('document_check', navigation)) return;
    navigation.navigate('Analyzing', { documentText: trimmed, source: 'paste' });
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
    });
  }, [navigation, colors]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('pasteText.documentTextLabel')}</Text>
            <TouchableOpacity style={styles.pasteButton} activeOpacity={0.8} onPress={handlePaste}>
              <ClipboardList size={20} color={colors.secondaryText} strokeWidth={2} />
              <Text style={styles.pasteButtonText}>{t('pasteText.pasteButton')}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.fieldInput, fieldError ? styles.fieldInputError : null]}
            value={documentText}
            onChangeText={(v) => { setDocumentText(v); setFieldError(''); }}
            placeholder={t('pasteText.placeholder')}
            placeholderTextColor={colors.secondaryText}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
            includeFontPadding={false}
          />
          {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
        </ScrollView>

        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.analyzeButton}
            activeOpacity={0.85}
            onPress={handleAnalyze}
          >
            <Text style={styles.analyzeButtonText}>{t('pasteText.analyzeButton')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

