/**
 * AI Lawyer - Icon Button (Liquid Glass, iOS 26)
 * Uses @callstack/liquid-glass for real iOS 26 glass material
 * Supports Dark Mode via useTheme().
 */

import React from 'react';
import { TouchableOpacity, Pressable, StyleSheet, Platform, View } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '../lib/liquidGlass';
import { useTheme } from '../theme';

export default function IconButton({
  icon: Icon,
  onPress,
  style,
  iconColor,
  iconSize = 24,
  strokeWidth = 2,
  size = 44,
}) {
  const { colors } = useTheme();
  const effectiveIconSize = Platform.OS === 'android' ? 24 : iconSize;
  const radius = size / 2;
  const fallbackStyle = {
    ...Platform.select({
      ios: {
        backgroundColor: colors.alternate,
        borderWidth: 0.5,
        borderColor: colors.tertiary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        elevation: 0,
      },
    }),
  };

  const useGlass = Platform.OS === 'ios' && isLiquidGlassSupported;
  const content = (
    <View
      style={[
        styles.clipCircle,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {useGlass ? (
        <LiquidGlassView
          style={[styles.glass, { width: size, height: size, borderRadius: radius }]}
          effect="clear"
        >
          {Icon && (
            <Icon
              size={effectiveIconSize}
              color={iconColor ?? colors.primaryText}
              strokeWidth={strokeWidth}
            />
          )}
        </LiquidGlassView>
      ) : (
        <View style={[styles.glass, { width: size, height: size, borderRadius: radius }, fallbackStyle]}>
          {Icon && (
            <Icon
              size={effectiveIconSize}
              color={iconColor ?? colors.primaryText}
              strokeWidth={strokeWidth}
            />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    if (Platform.OS === 'android') {
      const touchable = (
        <Pressable
          onPress={onPress}
          android_ripple={{ color: 'transparent' }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          {content}
        </Pressable>
      );
      // Обрезаем любой возможный ripple от нативного хедера по кругу
      return (
        <View style={[styles.clipCircle, { width: size, height: size, borderRadius: radius }]}>
          {touchable}
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  clipCircle: {
    overflow: 'hidden',
  },
  glass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
