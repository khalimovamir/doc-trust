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

export function NativeHeaderButtonInfo({ onPress }) {
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
          name="info"
          size={ICON_SIZE}
          tintColor={tint}
          type="monochrome"
          fallback={<View style={styles.placeholder} />}
        />
      </Pressable>
    );
  }
  const { Info } = require('lucide-react-native');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      hitSlop={8}
      android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
    >
      <Info size={ICON_SIZE} color={tint} strokeWidth={2} />
    </Pressable>
  );
}

/** Use as trigger content inside MenuView: <MenuView ...><NativeHeaderButtonMenuIcon /></MenuView> */
export function NativeHeaderButtonMenuIcon() {
  const { colors } = useTheme();
  const tint = colors.primaryText;
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.wrap}>
        <SymbolView
          name="ellipsis"
          size={ICON_SIZE}
          tintColor={tint}
          type="monochrome"
          fallback={<View style={styles.placeholder} />}
        />
      </View>
    );
  }
  const { EllipsisVertical } = require('lucide-react-native');
  return (
    <View style={styles.wrap}>
      <EllipsisVertical size={ICON_SIZE} color={tint} strokeWidth={2} />
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
  pressed: {
    opacity: 0.6,
  },
  placeholder: { width: ICON_SIZE, height: ICON_SIZE },
});
