/**
 * AI Lawyer - Scanner Screen
 * Scan flow: header + slots + gallery + capture (expo-camera) + Analyze.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, ChevronLeft, Check, Info, FileScan, Zap } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import IconButton from '../components/IconButton';

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
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanArea: { flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    scanPreview: { flex: 1, width: '100%' },
    scanPlaceholder: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    scanPlaceholderIcon: { marginBottom: 16, opacity: 0.7 },
    scanPlaceholderText: { fontFamily, fontSize: 17, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
    cardsRowWrap: { backgroundColor: '#000', paddingTop: 8, paddingBottom: spacing.sm, overflow: 'visible' },
    cardsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: 10, gap: spacing.sm },
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
      backgroundColor: 'transparent',
    },
    cardPlus: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.5)',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomPanel: {
      backgroundColor: '#000',
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
    captureButtonInnerWrap: {
      width: '100%',
      height: '100%',
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
    scanningBanner: {
      position: 'absolute',
      top: 72,
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanningBannerText: { fontFamily, fontSize: 15, fontWeight: '600', color: '#fff' },
  };
}

export default function ScannerScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const captureScale = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [scans, setScans] = useState([]);
  const [slotCount, setSlotCount] = useState(5);
  const [targetSlotIndex, setTargetSlotIndex] = useState(0);
  const [lastGalleryUri, setLastGalleryUri] = useState(null);
  const [lastDevicePhotoUri, setLastDevicePhotoUri] = useState(null);
  const [error, setError] = useState('');
  const [galleryGranted, setGalleryGranted] = useState(null);
  const [torchOn, setTorchOn] = useState(false);

  const ImagePicker = useMemo(() => require('expo-image-picker'), []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const checkGalleryPermission = useCallback(async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    setGalleryGranted(status === 'granted');
  }, [ImagePicker]);

  useEffect(() => {
    checkGalleryPermission();
  }, [checkGalleryPermission]);

  useEffect(() => {
    const selected = scans[targetSlotIndex];
    if (selected) setTorchOn(false);
  }, [scans, targetSlotIndex]);

  const requestGalleryPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setGalleryGranted(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('scanner.permissionGallery'));
      return false;
    }
    return true;
  }, [t, ImagePicker]);

  const addScanAt = useCallback((uri, mimeType, atIndex) => {
    setScans((prev) => {
      const next = [...prev];
      next.splice(atIndex, 0, { uri, mimeType: mimeType || 'image/jpeg' });
      const result = next.slice(0, MAX_SCANS);
      if (result.length === slotCount && slotCount < MAX_SCANS) {
        setSlotCount((s) => Math.min(s + 1, MAX_SCANS));
      }
      return result;
    });
    setTargetSlotIndex((prev) => Math.min(prev + 1, MAX_SCANS - 1));
    setError('');
  }, [slotCount]);

  const addScansAt = useCallback((images, startIndex) => {
    if (!images?.length) return;
    setScans((prev) => {
      let next = [...prev];
      let at = startIndex;
      for (const img of images) {
        next.splice(at, 0, { uri: img.uri, mimeType: img.type || 'image/jpeg' });
        at++;
      }
      const result = next.slice(0, MAX_SCANS);
      if (result.length >= slotCount && slotCount < MAX_SCANS) {
        setSlotCount((s) => Math.min(MAX_SCANS, Math.max(s, result.length + 1)));
      }
      return result;
    });
    setTargetSlotIndex((prev) => Math.min(prev + images.length, MAX_SCANS - 1));
    setError('');
  }, [slotCount]);

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
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        addScanAt(photo.uri, 'image/jpeg', targetSlotIndex);
      }
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || t('scanner.noTextFound'));
    }
  }, [scans.length, slotCount, permission?.granted, requestPermission, addScanAt, targetSlotIndex, t]);

  const fetchLastDevicePhoto = useCallback(async () => {
    if (!galleryGranted) return;
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      if (assets?.length > 0) {
        const info = await MediaLibrary.getAssetInfoAsync(assets[0].id);
        if (info?.localUri) setLastDevicePhotoUri(info.localUri);
      }
    } catch (_) {
      // ignore
    }
  }, [galleryGranted]);

  useFocusEffect(
    useCallback(() => {
      checkGalleryPermission();
      requestGalleryPermission().then((granted) => {
        if (granted) fetchLastDevicePhoto();
      });
    }, [checkGalleryPermission, requestGalleryPermission, fetchLastDevicePhoto])
  );

  useEffect(() => {
    if (galleryGranted) fetchLastDevicePhoto();
  }, [galleryGranted, fetchLastDevicePhoto]);

  const handleChooseGallery = useCallback(async () => {
    if (scans.length >= slotCount) return;
    if (!(await requestGalleryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setLastGalleryUri(asset.uri);
    addScanAt(asset.uri, asset.mimeType || 'image/jpeg', targetSlotIndex);
  }, [scans.length, slotCount, requestGalleryPermission, addScanAt, targetSlotIndex, ImagePicker]);

  const handleStartAnalyzing = useCallback(() => {
    if (scans.length === 0) return;
    setError('');
    navigation.navigate('Analyzing', {
      scanImages: scans.map((s) => ({ uri: s.uri, mimeType: s.mimeType || 'image/jpeg' })),
      source: 'scan',
    });
  }, [scans, navigation]);

  const canAddMore = slotCount < MAX_SCANS;
  const hasScans = scans.length > 0;
  const selectedScan = scans[targetSlotIndex];

  return (
    <View style={styles.container}>
      <View style={styles.scanArea}>
        {selectedScan ? (
          <Image source={{ uri: selectedScan.uri }} style={styles.scanPreview} resizeMode="contain" />
        ) : permission?.granted ? (
          <CameraView ref={cameraRef} style={styles.scanPreview} enableTorch={torchOn} />
        ) : (
          <View style={styles.scanPlaceholder}>
            <View style={styles.scanPlaceholderIcon}>
              <FileScan size={64} color="rgba(255,255,255,0.6)" strokeWidth={1.5} />
            </View>
            <Text style={styles.scanPlaceholderText}>{t('scanner.tapToScan')}</Text>
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
            {permission?.granted && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setTorchOn((on) => !on)}
                activeOpacity={0.8}
              >
                <Zap
                  size={22}
                  color={torchOn ? colors.primary : '#fff'}
                  strokeWidth={torchOn ? 2.5 : 2}
                  fill={torchOn ? colors.primary : 'transparent'}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => Alert.alert(t('scanner.title'), t('scanner.instructions'))}
              activeOpacity={0.8}
            >
              <Info size={22} color="#fff" strokeWidth={2} />
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
              disabled={false}
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
            disabled={!canAddMore}
            activeOpacity={0.85}
          >
            {(lastDevicePhotoUri ?? lastGalleryUri) ? (
              <Image source={{ uri: lastDevicePhotoUri ?? lastGalleryUri }} style={styles.galleryThumbImage} resizeMode="cover" />
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
              onPressIn={() => {
                Animated.spring(captureScale, { toValue: 0.9, useNativeDriver: true, speed: 100, bounciness: 0 }).start();
              }}
              onPressOut={() => {
                Animated.spring(captureScale, { toValue: 1, useNativeDriver: true, speed: 100, bounciness: 6 }).start();
              }}
              disabled={!canAddMore}
              activeOpacity={1}
            >
              <Animated.View style={[styles.captureButtonInnerWrap, { transform: [{ scale: captureScale }] }]}>
                <View style={styles.captureInner} />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.checkButton, hasScans && styles.checkButtonActive]}
            onPress={handleStartAnalyzing}
            disabled={!hasScans}
            activeOpacity={0.85}
          >
            <Check size={24} color={hasScans ? colors.success : '#fff'} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
