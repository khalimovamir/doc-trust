/**
 * AI Lawyer - Upload File Screen
 * Pick document (TXT, PDF, DOCX, PNG, JPG) -> extract text -> Start Analyzing -> AnalysisResult.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, X } from 'lucide-react-native';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import { NativeHeaderButtonInfo } from '../components/NativeHeaderButton';
import { pickDocumentAndGetText } from '../lib/uploadDocument';

function createStyles(colors) {
  return {
  container: { flex: 1, backgroundColor: colors.primaryBackground },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xl },
  uploadArea: {
    minHeight: 150,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.tertiary,
    backgroundColor: colors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  uploadTitle: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.secondaryText, marginTop: spacing.md, marginBottom: spacing.xs },
  uploadHint: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
  errorRow: { marginTop: spacing.md, paddingHorizontal: 4 },
  errorText: { fontFamily, fontSize: 14, color: colors.error },
  fileCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tertiary,
    backgroundColor: colors.secondaryBackground,
    paddingTop: 16,
    paddingRight: 14,
    paddingBottom: 16,
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fileCardIconWrap: { marginRight: 12, paddingTop: 2 },
  fileCardContent: { flex: 1, paddingRight: 12, minWidth: 0 },
  fileCardTitle: { fontFamily, fontSize: 16, fontWeight: '600', color: colors.primaryText, lineHeight: 24 },
  fileCardMeta: { marginTop: 10, fontFamily, fontSize: 12, fontWeight: '500', color: colors.secondaryText, lineHeight: 16 },
  fileCardClose: { padding: 4 },
  bottomAction: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  analyzeButton: { height: 56, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  analyzeButtonDisabled: { opacity: 0.5 },
  analyzeButtonText: { fontFamily, fontSize: 16, fontWeight: '600', color: '#ffffff' },
  };
}

export default function UploadFileScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [documentText, setDocumentText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInfoPress = () => {
    Alert.alert(
      t('uploadFile.infoDialogTitle'),
      t('uploadFile.infoDialogMessage'),
      [{ text: t('common.close') }]
    );
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerRight: () => <NativeHeaderButtonInfo onPress={handleInfoPress} />,
    });
  }, [navigation, colors, handleInfoPress]);

  const handlePickDocument = async () => {
    setError('');
    setLoading(true);
    try {
      const { text, fileName: name } = await pickDocumentAndGetText();
      setDocumentText(text);
      setFileName(name);
    } catch (e) {
      if (e?.message === 'CANCELLED') {
        return;
      }
      setError(e?.message || t('uploadFile.errorLoadDocument'));
      setDocumentText('');
      setFileName('');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDocumentText('');
    setFileName('');
    setError('');
  };

  const handleStartAnalyzing = () => {
    const trimmed = (documentText || '').trim();
    if (!trimmed) {
      setError(t('uploadFile.errorSelectFirst'));
      return;
    }
    navigation.navigate('Analyzing', { documentText: trimmed, source: 'upload' });
  };

  const hasDocument = documentText.trim().length > 0;
  const charCount = (documentText || '').trim().length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasDocument ? (
          <TouchableOpacity
            style={styles.uploadArea}
            activeOpacity={0.85}
            onPress={handlePickDocument}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <FileText size={32} color={colors.secondaryText} strokeWidth={1.5} />
                <Text style={styles.uploadTitle}>{t('uploadFile.tapToSelect')}</Text>
                <Text style={styles.uploadHint}>{t('uploadFile.supportedFormats')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {hasDocument && !loading ? (
          <View style={styles.fileCard}>
            <View style={styles.fileCardIconWrap}>
              <FileText size={24} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.fileCardContent}>
              <Text style={styles.fileCardTitle} numberOfLines={2} ellipsizeMode="tail">
                {fileName}
              </Text>
              <Text style={styles.fileCardMeta}>
                {t('uploadFile.characters', { count: charCount })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fileCardClose}
              onPress={handleClear}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={24} color={colors.primaryText} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[styles.analyzeButton, !hasDocument && styles.analyzeButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleStartAnalyzing}
          disabled={!hasDocument || loading}
        >
          <Text style={styles.analyzeButtonText}>{t('uploadFile.startAnalyzing')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

