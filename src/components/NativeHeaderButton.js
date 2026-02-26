/**
 * Native-style header button for App Bar.
 * iOS: SF Symbol (expo-symbols), no background.
 * Android: Lucide icon, no background.
 * Use for menu, info, etc. — looks like system bar button.
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '../theme';

const MIN_TOUCH_SIZE = 44;
const ICON_SIZE = 22;

/** Native back button for header (e.g. Chat, AILawyer, ComparingResult). */
export function NativeHeaderButtonBack({ onPress }) {
  const { colors } = useTheme();
  const tint = colors.primaryText;
  if (Platform.OS === 'ios') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
        hitSlop={8}
      >
        <SymbolView
          name="chevron.left"
          size={ICON_SIZE + 2}
          tintColor={tint}
          type="monochrome"
          fallback={<View style={[styles.placeholder, { width: ICON_SIZE + 2, height: ICON_SIZE + 2 }]} />}
        />
      </Pressable>
    );
  }
  const { ChevronLeft } = require('lucide-react-native');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      hitSlop={8}
      android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
    >
      <ChevronLeft size={ICON_SIZE + 2} color={tint} strokeWidth={2} />
    </Pressable>
  );
}

/** Кнопка «i» в шапке — круглая на iOS; на Android — как кнопка «назад» (wrap). */
export function NativeHeaderButtonInfo({ onPress, iconSize = ICON_SIZE }) {
  const { colors } = useTheme();
  const tint = colors.primaryText;
  const content =
    Platform.OS === 'ios' ? (
      <SymbolView
        name="info.circle"
        size={iconSize}
        tintColor={tint}
        type="monochrome"
        fallback={<View style={[styles.placeholder, { width: iconSize, height: iconSize }]} />}
      />
    ) : (
      (() => {
        const { Info } = require('lucide-react-native');
        return <Info size={iconSize} color={tint} strokeWidth={2} />;
      })()
    );
  if (Platform.OS === 'android') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.wrapRightAndroid, pressed && styles.pressed]}
        hitSlop={8}
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={styles.circleWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.circlePressable, pressed && styles.pressed]}
        hitSlop={8}
      >
        {content}
      </Pressable>
    </View>
  );
}

/** Кнопка меню: круглая 44×44 на iOS; на Android — как кнопка «назад» (wrap, без круга). */
export function NativeHeaderButtonEllipsis({ iconSize = 24 }) {
  const { colors } = useTheme();
  const tint = colors.primaryText;
  const content =
    Platform.OS === 'ios' ? (
      <SymbolView
        name="ellipsis"
        size={iconSize}
        tintColor={tint}
        type="monochrome"
        fallback={<View style={[styles.placeholder, { width: iconSize, height: iconSize }]} />}
      />
    ) : (
      (() => {
        const { MoreVertical } = require('lucide-react-native');
        return <MoreVertical size={iconSize} color={tint} strokeWidth={2} />;
      })()
    );
  if (Platform.OS === 'android') {
    return <View style={styles.wrapRightAndroid}>{content}</View>;
  }
  return (
    <View style={styles.circleWrap}>
      <View style={styles.circlePressable}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  /** На Android правые кнопки — тот же размер 44×44 и выравнивание, что и кнопка «назад». */
  wrapRightAndroid: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  /** Квадрат 44×44: жёстко фиксируем, чтобы app bar не растягивал в овал. */
  circleWrap: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    maxWidth: MIN_TOUCH_SIZE,
    maxHeight: MIN_TOUCH_SIZE,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePressable: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    maxWidth: MIN_TOUCH_SIZE,
    maxHeight: MIN_TOUCH_SIZE,
    borderRadius: MIN_TOUCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    borderRadius: MIN_TOUCH_SIZE / 2,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.6,
  },
  placeholder: { width: ICON_SIZE, height: ICON_SIZE },
});
