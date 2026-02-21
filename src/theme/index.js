/**
 * AI Lawyer - Theme
 * Central export for colors, typography, spacing, theme context
 */

export { colors, lightColors, darkColors } from './colors';
export { typography, fontFamily } from './typography';
export { spacing, borderRadius } from './spacing';
export { ThemeProvider, useTheme } from '../context/ThemeContext';

import { colors } from './colors';
import { typography, fontFamily } from './typography';
import { spacing, borderRadius } from './spacing';

const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  borderRadius,
};

export default theme;
