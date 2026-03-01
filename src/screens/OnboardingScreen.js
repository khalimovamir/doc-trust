/**
 * AI Lawyer - Onboarding Screen
 * 4 slides with illustration, title, subtitle, pagination dots, Get Started button
 */

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily, useTheme } from '../theme';
import PrimaryButton from '../components/PrimaryButton';

const IMAGE_SIZE = 400;
const TITLE_SIZE = 28;
const TITLE_FONT_WEIGHT = '700';
const TITLE_PADDING_H = 20;
const TITLE_MARGIN_BOTTOM = 12;
const SUBTITLE_SIZE = 14;
const SUBTITLE_FONT_WEIGHT = '400';
const SUBTITLE_MARGIN_BOTTOM = 24;
const DOT_SIZE = 10;
const DOT_SPACING = 6;
const DOTS_MARGIN_BOTTOM = 64;

const ONBOARDING_IMAGES = [
  require('../../assets/Onboarding_1.png'),
  require('../../assets/Onboarding_2.png'),
  require('../../assets/Onboarding_3.png'),
  require('../../assets/Onboarding_4.png'),
];

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.secondaryBackground },
    slide: { flex: 1, paddingHorizontal: TITLE_PADDING_H },
    slideColumn: { flex: 1 },
    imageWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    image: { width: IMAGE_SIZE, height: IMAGE_SIZE },
    textBlock: { paddingHorizontal: 4 },
    title: { fontFamily, fontSize: TITLE_SIZE, fontWeight: TITLE_FONT_WEIGHT, lineHeight: TITLE_SIZE * 1.25, color: colors.primaryText, textAlign: 'center', marginBottom: TITLE_MARGIN_BOTTOM },
    subtitle: { fontFamily, fontSize: SUBTITLE_SIZE, fontWeight: SUBTITLE_FONT_WEIGHT, lineHeight: SUBTITLE_SIZE * 1.5, color: colors.secondaryText, textAlign: 'center', marginBottom: SUBTITLE_MARGIN_BOTTOM },
    footer: { paddingBottom: 0 },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: DOTS_MARGIN_BOTTOM },
    dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: colors.tertiary, marginHorizontal: DOT_SPACING / 2 },
    dotActive: { backgroundColor: colors.primary },
    getStartedButton: { borderRadius: 30 },
  };
}

export default function OnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const { width } = useWindowDimensions();

  const slides = useMemo(
    () => [
      { id: '1', titleKey: 'onboarding.slide1Title', subtitleKey: 'onboarding.slide1Subtitle', image: ONBOARDING_IMAGES[0] },
      { id: '2', titleKey: 'onboarding.slide2Title', subtitleKey: 'onboarding.slide2Subtitle', image: ONBOARDING_IMAGES[1] },
      { id: '3', titleKey: 'onboarding.slide3Title', subtitleKey: 'onboarding.slide3Subtitle', image: ONBOARDING_IMAGES[2] },
      { id: '4', titleKey: 'onboarding.slide4Title', subtitleKey: 'onboarding.slide4Subtitle', image: ONBOARDING_IMAGES[3] },
    ],
    []
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleGetStarted = () => {
    navigation.navigate('OnboardingJurisdiction');
  };

  const handleContinue = () => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < slides.length) {
      flatListRef.current?.scrollToOffset({ offset: width * nextIndex, animated: true });
    }
  };

  const isLastSlide = activeIndex === slides.length - 1;

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.slideColumn}>
        <View style={styles.imageWrap}>
          <Image
            source={item.image}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{t(item.titleKey)}</Text>
          <Text style={styles.subtitle}>{t(item.subtitleKey)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        decelerationRate="fast"
        removeClippedSubviews={false}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <PrimaryButton
          title={isLastSlide ? t('onboarding.getStarted') : t('onboarding.continue')}
          onPress={isLastSlide ? handleGetStarted : handleContinue}
          containerStyle={styles.getStartedButton}
        />
      </View>
    </SafeAreaView>
  );
}

