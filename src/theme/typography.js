/**
 * AI Lawyer - Typography
 * Uses SF Pro (system font on iOS), fallback on Android
 */

import { Platform } from 'react-native';

// SF Pro is the default system font on iOS
// On Android we use sans-serif (Roboto) - can be replaced with SF Pro font files if needed
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  // Display
  displayLarge: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  displayMedium: {
    fontFamily,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
  },
  displaySmall: {
    fontFamily,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },

  // Headlines
  headlineLarge: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  headlineMedium: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  headlineSmall: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },

  // Title
  titleLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  titleMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  titleSmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Body
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Label
  labelLarge: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
};

export default typography;
