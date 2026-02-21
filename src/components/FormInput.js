/**
 * AI Lawyer - Form Input
 * Label + TextInput, optional right icon (e.g. password visibility)
 */

import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, fontFamily, spacing, borderRadius, useTheme } from '../theme';

const INPUT_HEIGHT = 56;

function createStyles(colors) {
  return {
    wrapper: { marginBottom: spacing.lg },
    label: { fontFamily, fontSize: 14, fontWeight: '500', color: colors.primaryText, marginBottom: 14 },
    inputRow: { position: 'relative' },
    input: {
      height: INPUT_HEIGHT,
      backgroundColor: colors.secondaryBackground,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingHorizontal: spacing.md,
      fontFamily,
      fontSize: 16,
      fontWeight: '400',
      color: colors.primaryText,
    },
    inputWithIcon: { paddingRight: INPUT_HEIGHT },
    inputError: { borderColor: colors.error },
    iconTouch: { position: 'absolute', right: 0, top: 0, bottom: 0, width: INPUT_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    error: { fontFamily, fontSize: 12, fontWeight: '400', color: colors.error, marginTop: 10, marginLeft: 16 },
  };
}

export default function FormInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  rightIcon,
  onRightIconPress,
  error,
  ...rest
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            rightIcon && styles.inputWithIcon,
            error ? styles.inputError : null,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryText}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconTouch}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

