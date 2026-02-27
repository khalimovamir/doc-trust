/**
 * AI Lawyer - Send Idea Screen
 * Submit feature request to Supabase, then go back.
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
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { useAuth } from '../context/AuthContext';
import { createFeatureRequest, getMyFeatureRequestCount } from '../lib/featureRequests';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    keyboardView: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xl },
    form: { gap: spacing.md },
    field: { marginBottom: spacing.md },
    label: { fontFamily, fontSize: 14, fontWeight: '500', color: colors.primaryText, marginBottom: 14 },
    input: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, backgroundColor: colors.secondaryBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary, paddingHorizontal: 16, paddingVertical: 18.5 },
    inputIdea: { textAlignVertical: 'top', minHeight: 6 * 24 + 18.5 * 2 },
    inputError: { borderColor: colors.error },
    errorText: { fontFamily, fontSize: 12, fontWeight: '400', color: colors.error, marginTop: 10, marginLeft: 16, marginBottom: 0, marginRight: 0, padding: 0 },
    footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.primaryBackground },
    sendButton: { height: 56, backgroundColor: colors.primary, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    sendButtonText: { fontFamily, fontSize: 16, fontWeight: '500', color: '#ffffff' },
  };
}

export default function SendIdeaScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [titleError, setTitleError] = useState('');
  const [ideaError, setIdeaError] = useState('');
  const [sending, setSending] = useState(false);

  const handleBack = () => navigation.goBack();

  const handleSend = async () => {
    const tVal = title.trim();
    const d = idea.trim();
    setTitleError('');
    setIdeaError('');
    if (!tVal) setTitleError(t('featureRequestScreen.errorTitleRequired'));
    if (!d) setIdeaError(t('featureRequestScreen.errorIdeaRequired'));
    if (!tVal || !d) return;
    if (!user?.id) {
      Alert.alert(t('common.error'), t('featureRequestScreen.signInRequired'));
      return;
    }
    const count = await getMyFeatureRequestCount(user.id);
    if (count >= 2) {
      Alert.alert(t('auth.limitReachedTitle'), t('featureRequestScreen.limitReached'));
      return;
    }
    setSending(true);
    try {
      await createFeatureRequest({ title: tVal, description: d }, user.id);
      Alert.alert(t('featureRequestScreen.thankYou'), t('featureRequestScreen.submitted'), [
        { text: t('featureRequestScreen.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg = e?.code === 'FEATURE_REQUEST_LIMIT' ? t('featureRequestScreen.limitReached') : (e?.message ?? t('featureRequestScreen.submitFailed'));
      Alert.alert(t('common.error'), msg);
    } finally {
      setSending(false);
    }
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
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('featureRequestScreen.titleLabel')}</Text>
              <TextInput
                style={[styles.input, titleError ? styles.inputError : null]}
                value={title}
                onChangeText={(v) => { setTitle(v); setTitleError(''); }}
                placeholder={t('featureRequestScreen.titlePlaceholder')}
                placeholderTextColor={colors.secondaryText}
                autoCapitalize="sentences"
                multiline
                scrollEnabled={false}
                maxLength={200}
              />
              {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t('featureRequestScreen.ideaLabel')}</Text>
              <TextInput
                style={[styles.input, styles.inputIdea, ideaError ? styles.inputError : null]}
                value={idea}
                onChangeText={(v) => { setIdea(v); setIdeaError(''); }}
                placeholder={t('featureRequestScreen.ideaPlaceholder')}
                placeholderTextColor={colors.secondaryText}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
                maxLength={2000}
              />
              {ideaError ? <Text style={styles.errorText}>{ideaError}</Text> : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.sendButtonText}>{t('featureRequestScreen.send')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

