/**
 * AI Lawyer - Primary Button
 * Global button design: height 56, rounded corners, Primary color, text 16/500, padding 16
 */

import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { typography, borderRadius, useTheme } from '../theme';

const BUTTON_HEIGHT = 56;
const HORIZONTAL_PADDING = 16;
const BOTTOM_PADDING = 16;

function createStyles(colors) {
  return {
    container: {
      height: BUTTON_HEIGHT,
      marginHorizontal: HORIZONTAL_PADDING,
      marginBottom: BOTTOM_PADDING,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      ...typography.labelLarge,
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
    },
    disabled: { opacity: 0.6 },
  };
}

export default function PrimaryButton({ title, onPress, style, containerStyle, disabled }) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, containerStyle, disabled && styles.disabled]}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

export { BUTTON_HEIGHT, HORIZONTAL_PADDING, BOTTOM_PADDING };
