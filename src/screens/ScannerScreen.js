/**
 * AI Lawyer - Scanner Screen
 * In-app camera: user shoots on this page. No app bar — back (left), flashlight (right).
 * Card slots: user selects which slot receives the next image (highlighted).
 * Text detection overlay placeholder for future ML/OCR bounding boxes.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, ChevronLeft, Zap, Check, Info } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { getTextFromImageUri } from '../lib/uploadDocument';

const MAX_SCANS = 20;
const CARD_SIZE = 56;
const GALLERY_THUMB_SIZE = 52;

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: '#000' },
    topOverlay: {
      zIndex: 10,
      elevation: 10,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    topRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    controlButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.13)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraWrap: { flex: 1, overflow: 'hidden' },
    camera: { flex: 1, width: '100%' },
    cardsRowWrap: { backgroundColor: '#0b1220', paddingVertical: spacing.sm },
    cardsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
    cardWrap: { position: 'relative' },
    card: { width: CARD_SIZE, height: CARD_SIZE, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
    cardTarget: { borderColor: colors.primary, borderWidth: 2.5 },
    cardImage: { width: '100%', height: '100%' },
    cardRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.secondaryBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardEmpty: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.4)',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    cardPlus: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.5)',
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomPanel: {
      backgroundColor: '#0b1220',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    captureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    galleryThumb: {
      width: GALLERY_THUMB_SIZE,
      height: GALLERY_THUMB_SIZE,
      borderRadius: GALLERY_THUMB_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    galleryThumbImage: { width: '100%', height: '100%' },
    galleryThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    galleryThumbPlaceholderText: { fontSize: 24, color: 'rgba(255,255,255,0.6)' },
    captureCenter: { alignItems: 'center' },
    captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 4,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    captureInner: {
      width: 66,
      height: 66,
      borderRadius: 33,
      borderWidth: 1,
      borderColor: '#000',
      backgroundColor: '#fff',
    },
    captureSpacer: { width: GALLERY_THUMB_SIZE },
    checkButton: {
      width: GALLERY_THUMB_SIZE,
      height: GALLERY_THUMB_SIZE,
      borderRadius: GALLERY_THUMB_SIZE / 2,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkButtonActive: {
      backgroundColor: colors.accent2,
      borderColor: colors.success,
    },
    permissionButtonText: { fontFamily, fontSize: 16, fontWeight: '600', color: '#ffffff' },
    extractingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    extractingText: { fontFamily, fontSize: 16, color: '#fff', marginTop: spacing.md },
    errorBanner: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: spacing.md,
      alignItems: 'center',
    },
    errorText: { fontFamily, fontSize: 14, color: colors.error, textAlign: 'center' },
  };
}

export default function ScannerScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [scans, setScans] = useState([]);
  const [slotCount, setSlotCount] = useState(5);
  const [targetSlotIndex, setTargetSlotIndex] = useState(0);
  const [lastGalleryUri, setLastGalleryUri] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  const requestGalleryPermission = useCallback(async () => {
    const { status } = await require('expo-image-picker').requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('scanner.permissionGallery'));
      return false;
    }
    return true;
  }, [t]);

  const addScanAt = useCallback((uri, mimeType, atIndex) => {
    setScans((prev) => {
      const next = [...prev];
      next.splice(atIndex, 0, { uri, mimeType: mimeType || 'image/jpeg' });
      return next.slice(0, MAX_SCANS);
    });
    setTargetSlotIndex((prev) => Math.min(prev + 1, MAX_SCANS - 1));
    setError('');
  }, []);

  const removeScan = useCallback((index) => {
    setScans((prev) => prev.filter((_, i) => i !== index));
    setTargetSlotIndex((prev) => Math.min(prev, Math.max(0, scans.length - 1)));
    setError('');
  }, [scans.length]);

  const handleTakePhoto = useCallback(async () => {
    if (scans.length >= slotCount) return;
    if (!permission?.granted) {
      const ok = await requestPermission();
      if (!ok) return;
    }
    if (!cameraRef.current) return;
    try {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });
      if (result?.uri) addScanAt(result.uri, 'image/jpeg', targetSlotIndex);
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || t('scanner.noTextFound'));
    }
  }, [scans.length, slotCount, permission?.granted, requestPermission, addScanAt, targetSlotIndex, t]);

  const handleChooseGallery = useCallback(async () => {
    if (scans.length >= slotCount) return;
    if (!(await requestGalleryPermission())) return;
    const ImagePicker = require('expo-image-picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setLastGalleryUri(asset.uri);
    addScanAt(asset.uri, asset.mimeType || 'image/jpeg', targetSlotIndex);
  }, [scans.length, slotCount, requestGalleryPermission, addScanAt, targetSlotIndex]);

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

  useEffect(() => {
    if (permission?.granted) {
      require('expo-image-picker').requestMediaLibraryPermissionsAsync();
    }
  }, [permission?.granted]);

  const canAddMore = slotCount < MAX_SCANS;
  const hasScans = scans.length > 0;

  if (!permission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', padding: spacing.lg }]} edges={['top']}>
        <Text style={{ fontFamily, fontSize: 16, color: '#fff', textAlign: 'center', marginBottom: spacing.md }}>
          {t('scanner.permissionCamera')}
        </Text>
        <TouchableOpacity
          style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 12 }}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>{t('common.next')}</Text>
        </TouchableOpacity>
        <IconButton icon={ChevronLeft} onPress={() => navigation.goBack()} size={36} iconSize={22} style={{ position: 'absolute', left: spacing.md, top: spacing.lg }} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          enableTorch={torchOn}
        />
        {extracting && (
          <View style={styles.extractingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.extractingText}>{t('scanner.extracting')}</Text>
          </View>
        )}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <SafeAreaView style={[StyleSheet.absoluteFill, styles.topOverlay]} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ChevronLeft size={24} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.topRowRight}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => Alert.alert(t('scanner.title'), t('scanner.instructions'))}
              activeOpacity={0.8}
            >
              <Info size={22} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setTorchOn((v) => !v)}
              activeOpacity={0.8}
            >
              <Zap size={22} color={torchOn ? colors.primary : '#fff'} strokeWidth={2} fill={torchOn ? colors.primary : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.cardsRowWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {Array.from({ length: slotCount }, (_, index) => {
            const scan = scans[index];
            const isTarget = index === targetSlotIndex;
            if (scan) {
              return (
                <View key={`${scan.uri}-${index}`} style={styles.cardWrap}>
                  <TouchableOpacity
                    style={[styles.card, isTarget && styles.cardTarget]}
                    onPress={() => setTargetSlotIndex(index)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: scan.uri }} style={styles.cardImage} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardRemove} onPress={() => removeScan(index)} hitSlop={8}>
                    <X size={14} color={colors.primaryText} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={`empty-${index}`}
                style={[styles.cardEmpty, isTarget && styles.cardTarget]}
                onPress={() => setTargetSlotIndex(index)}
                activeOpacity={0.8}
              />
            );
          })}
          {canAddMore && (
            <TouchableOpacity
              style={styles.cardPlus}
              onPress={() => {
                setSlotCount((prev) => Math.min(prev + 1, MAX_SCANS));
                setTargetSlotIndex(slotCount);
              }}
              disabled={extracting}
              activeOpacity={0.85}
            >
              <Plus size={28} color="rgba(255,255,255,0.9)" strokeWidth={2} />
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
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.checkButton, hasScans && styles.checkButtonActive]}
            onPress={handleStartAnalyzing}
            disabled={!hasScans || extracting}
            activeOpacity={0.85}
          >
            <Check size={24} color={hasScans ? colors.success : '#fff'} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
