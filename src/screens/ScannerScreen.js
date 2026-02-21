/**
 * AI Lawyer - Scanner Screen
 * Multiple scans (up to 10 cards), add via camera or gallery. Last gallery image as thumbnail.
 * Text extraction runs only on "Start Analyzing". Dashed frame shows scan area.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Circle, Plus } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { getTextFromImageUri } from '../lib/uploadDocument';

const MAX_SCANS = 10;
const CARD_SIZE = 56;
const GALLERY_THUMB_SIZE = 52;

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    controlButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.alternate, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily, fontSize: 18, fontWeight: '600', color: colors.primaryText },
    preview: { flex: 1, backgroundColor: colors.secondaryBackground, justifyContent: 'center', alignItems: 'center' },
    placeholder: { alignItems: 'center', paddingHorizontal: spacing.lg },
    scanFrame: { width: 280, height: 320, position: 'relative', marginBottom: spacing.md },
    scanFrameOverlay: { position: 'absolute', top: '10%', left: '5%', right: '5%', bottom: '10%' },
    frameCorner: { position: 'absolute', width: 48, height: 48, borderColor: colors.tertiary, borderStyle: 'dashed', borderRadius: 2 },
    frameTl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
    frameTr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
    frameBl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
    frameBr: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
    frameHint: { fontFamily, fontSize: 14, color: colors.secondaryText, marginBottom: spacing.sm, textAlign: 'center' },
    instructions: { fontFamily, fontSize: 15, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', lineHeight: 22 },
    capturedWrap: { width: '100%', flex: 1, position: 'relative' },
    capturedImage: { width: '100%', height: '100%' },
    extractingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    extractingText: { fontFamily, fontSize: 16, color: colors.primaryText, marginTop: spacing.md },
    errorBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.secondaryBackground, padding: spacing.md, alignItems: 'center' },
    errorText: { fontFamily, fontSize: 14, color: colors.error, textAlign: 'center' },
    cardsRowWrap: { backgroundColor: colors.primaryBackground, paddingVertical: spacing.sm },
    cardsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
    cardWrap: { position: 'relative' },
    card: { width: CARD_SIZE, height: CARD_SIZE, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.tertiary },
    cardImage: { width: '100%', height: '100%' },
    cardRemove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.alternate, alignItems: 'center', justifyContent: 'center' },
    cardEmpty: { width: CARD_SIZE, height: CARD_SIZE, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.tertiary, backgroundColor: colors.alternate },
    cardPlus: { width: CARD_SIZE, height: CARD_SIZE, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.tertiary, backgroundColor: colors.accent1, alignItems: 'center', justifyContent: 'center' },
    bottomPanel: { backgroundColor: colors.primaryBackground, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
    captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    galleryThumb: { width: GALLERY_THUMB_SIZE, height: GALLERY_THUMB_SIZE, borderRadius: GALLERY_THUMB_SIZE / 2, overflow: 'hidden', backgroundColor: colors.secondaryBackground, borderWidth: 1.5, borderColor: colors.tertiary },
    galleryThumbImage: { width: '100%', height: '100%' },
    galleryThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    galleryThumbPlaceholderText: { fontSize: 24, color: colors.secondaryText },
    captureCenter: { alignItems: 'center' },
    captureButton: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
    captureInner: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.primaryText },
    captureHint: { fontFamily, fontSize: 12, color: colors.secondaryText, marginTop: 4, textAlign: 'center' },
    captureSpacer: { width: GALLERY_THUMB_SIZE },
    analyzeButton: { height: 56, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    analyzeButtonDisabled: { opacity: 0.5 },
    analyzeButtonText: { fontFamily, fontSize: 16, fontWeight: '600', color: '#ffffff' },
  };
}

export default function ScannerScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [scans, setScans] = useState([]); // [{ uri, mimeType }]
  const [selectedIndex, setSelectedIndex] = useState(null); // which card is shown in main preview
  const [lastGalleryUri, setLastGalleryUri] = useState(null); // last image from device gallery (for thumbnail)
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('scanner.permissionCamera'));
      return false;
    }
    return true;
  }, [t]);

  const requestGalleryPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('scanner.permissionGallery'));
      return false;
    }
    return true;
  }, [t]);

  // Load last image from device gallery for the circular thumbnail (optional: native module may be missing in Expo Go)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const MediaLibrary = require('expo-media-library');
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const result = await MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: MediaLibrary.MediaType?.photo ?? MediaLibrary.MediaType?.IMAGE ?? 'image',
          sortBy: [[MediaLibrary.SortBy?.creationTime ?? 'creationTime', false]],
        });
        if (cancelled || !result?.assets?.length) return;
        const asset = result.assets[0];
        if (asset?.uri) setLastGalleryUri(asset.uri);
      } catch (_) {
        // expo-media-library native module not available (e.g. Expo Go) — skip last gallery thumb
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addScan = useCallback((uri, mimeType = 'image/jpeg') => {
    setScans((prev) => {
      if (prev.length >= MAX_SCANS) return prev;
      return [...prev, { uri, mimeType }];
    });
    setError('');
  }, []);

  const removeScan = useCallback((index) => {
    setScans((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((s) => {
      if (s == null) return null;
      if (s === index) return null;
      if (s > index) return s - 1;
      return s;
    });
    setError('');
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (scans.length >= MAX_SCANS) return;
    if (!(await requestCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    addScan(asset.uri, asset.mimeType || 'image/jpeg');
  }, [scans.length, requestCameraPermission, addScan]);

  const handleChooseGallery = useCallback(async () => {
    if (scans.length >= MAX_SCANS) return;
    if (!(await requestGalleryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setLastGalleryUri(asset.uri);
    addScan(asset.uri, asset.mimeType || 'image/jpeg');
  }, [scans.length, requestGalleryPermission, addScan]);

  const handleAddMore = useCallback(() => {
    handleTakePhoto();
  }, [handleTakePhoto]);

  const previewUri = selectedIndex != null && scans[selectedIndex]
    ? scans[selectedIndex].uri
    : scans.length > 0
      ? scans[scans.length - 1].uri
      : null;

  const handleStartAnalyzing = useCallback(async () => {
    if (scans.length === 0) return;
    setError('');
    setExtracting(true);
    try {
      const parts = [];
      for (let i = 0; i < scans.length; i++) {
        const { uri, mimeType } = scans[i];
        const text = await getTextFromImageUri(uri, mimeType || 'image/jpeg');
        if (text && text.trim()) {
          if (parts.length > 0) parts.push('\n\n--- \n\n');
          parts.push(text.trim());
        }
      }
      const combined = parts.join('');
      if (!combined || combined.length < 10) {
        setError(t('scanner.noTextFound'));
        setExtracting(false);
        return;
      }
      navigation.navigate('Analyzing', { documentText: combined, source: 'scan' });
    } catch (e) {
      setError(e?.message || t('scanner.noTextFound'));
    } finally {
      setExtracting(false);
    }
  }, [scans, t, navigation]);

  const canAddMore = scans.length < MAX_SCANS;
  const hasScans = scans.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <IconButton
          icon={X}
          onPress={() => navigation.goBack()}
          iconColor={colors.primaryText}
          strokeWidth={2.2}
          size={36}
          iconSize={22}
          style={styles.controlButton}
        />
        <Text style={styles.title}>{t('scanner.title')}</Text>
        <View style={styles.controlButton} />
      </View>

      <View style={styles.preview}>
        {!previewUri ? (
          <View style={styles.placeholder}>
            <View style={styles.scanFrame}>
              <View style={[styles.frameCorner, styles.frameTl]} />
              <View style={[styles.frameCorner, styles.frameTr]} />
              <View style={[styles.frameCorner, styles.frameBl]} />
              <View style={[styles.frameCorner, styles.frameBr]} />
            </View>
            <Text style={styles.frameHint}>{t('scanner.scanFrameHint')}</Text>
            <Text style={styles.instructions}>{t('scanner.instructions')}</Text>
          </View>
        ) : (
          <View style={styles.capturedWrap}>
            <Image source={{ uri: previewUri }} style={styles.capturedImage} resizeMode="contain" />
            <View style={styles.scanFrameOverlay} pointerEvents="none">
              <View style={[styles.frameCorner, styles.frameTl]} />
              <View style={[styles.frameCorner, styles.frameTr]} />
              <View style={[styles.frameCorner, styles.frameBl]} />
              <View style={[styles.frameCorner, styles.frameBr]} />
            </View>
            {extracting && (
              <View style={styles.extractingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.extractingText}>{t('scanner.extracting')}</Text>
              </View>
            )}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.cardsRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {scans.map((scan, index) => (
            <View key={`${scan.uri}-${index}`} style={styles.cardWrap}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedIndex(index)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: scan.uri }} style={styles.cardImage} resizeMode="cover" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardRemove}
                onPress={() => removeScan(index)}
                hitSlop={8}
              >
                <X size={14} color={colors.primaryText} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
          {Array.from({ length: Math.max(0, MAX_SCANS - scans.length) }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.cardEmpty} />
          ))}
          {canAddMore && (
            <TouchableOpacity
              style={styles.cardPlus}
              onPress={handleAddMore}
              disabled={extracting}
              activeOpacity={0.85}
            >
              <Plus size={28} color="rgba(255,255,255,0.8)" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={styles.galleryThumb}
            onPress={handleChooseGallery}
            disabled={extracting || !canAddMore}
            activeOpacity={0.85}
          >
            {lastGalleryUri ? (
              <Image source={{ uri: lastGalleryUri }} style={styles.galleryThumbImage} resizeMode="cover" />
            ) : (
              <View style={styles.galleryThumbPlaceholder}>
                <Text style={styles.galleryThumbPlaceholderText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.captureCenter}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleTakePhoto}
              disabled={extracting || !canAddMore}
              activeOpacity={0.9}
            >
              <Circle size={56} color={colors.primaryText} strokeWidth={1.8} />
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <Text style={styles.captureHint}>{t('scanner.takePhoto')}</Text>
          </View>

          <View style={styles.captureSpacer} />
        </View>

        <TouchableOpacity
          style={[styles.analyzeButton, (!hasScans || extracting) && styles.analyzeButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleStartAnalyzing}
          disabled={!hasScans || extracting}
        >
          <Text style={styles.analyzeButtonText}>{t('scanner.startAnalyzing')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

