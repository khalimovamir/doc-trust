/**
 * AI Lawyer - Color Themes (Light & Dark Mode)
 * Light Mode Theme and Dark Mode Theme from design specs.
 */

/** Light Mode Theme (default) */
export const lightColors = {
  // Brand Colors
  primary: '#3b82f6',
  secondary: '#111827',
  tertiary: '#eeeff2',
  alternate: '#f6f7f8',

  // Utility Colors
  primaryText: '#111827',
  secondaryText: '#6b7280',
  primaryBackground: '#f9fafb',
  secondaryBackground: '#ffffff',

  // Accent Colors (~13% opacity: Primary, Success, Error, Warning)
  accent1: 'rgba(59, 130, 246, 0.13)',
  accent2: 'rgba(56, 160, 16, 0.13)',
  accent3: 'rgba(239, 68, 68, 0.13)',
  accent4: 'rgba(217, 119, 6, 0.13)',

  // Semantic Colors
  success: '#38a010',
  error: '#ef4444',
  warning: '#d97706',
  info: '#ffffff',
};

/** Dark theme (Dark Mode palette) */
export const darkColors = {
  // Brand Colors
  primary: '#3b82f6',
  secondary: '#ffffff',
  tertiary: '#132238',
  alternate: '#172a44',  // Inner PRO card (slightly lighter than Secondary)

  // Utility Colors
  primaryText: '#ffffff',
  secondaryText: '#7d93b6',
  primaryBackground: '#0b1220',   // Primary Background (page) in Dark Mode
  secondaryBackground: '#0f1a2b', // Secondary Background (cards) in Dark Mode

  // Accent Colors (13% opacity)
  accent1: 'rgba(59, 130, 246, 0.13)',
  accent2: 'rgba(56, 160, 16, 0.13)',
  accent3: 'rgba(239, 68, 68, 0.13)',
  accent4: 'rgba(217, 119, 6, 0.13)',

  // Semantic Colors
  success: '#38a010',
  error: '#ef4444',
  warning: '#e99d00',
  info: '#ffffff',
};

/** @deprecated Use useTheme().colors or lightColors. Kept for default/static use. */
export const colors = lightColors;

export default colors;
