/**
 * AI Lawyer - Icon Button (Liquid Glass, iOS 26)
 * Uses @callstack/liquid-glass for real iOS 26 glass material
 * Supports Dark Mode via useTheme().
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
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
  const radius = size / 2;
  const fallbackStyle = {
    backgroundColor: colors.alternate,
    borderWidth: 0.5,
    borderColor: colors.tertiary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  };

  const content = (
    <View
      style={[
        styles.clipCircle,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <LiquidGlassView
        style={[
          styles.glass,
          { width: size, height: size, borderRadius: radius },
          !isLiquidGlassSupported && fallbackStyle,
        ]}
        effect="clear"
      >
        {Icon && (
          <Icon
            size={iconSize}
            color={iconColor ?? colors.primaryText}
            strokeWidth={strokeWidth}
          />
        )}
      </LiquidGlassView>
    </View>
  );

  if (onPress) {
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
