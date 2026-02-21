/**
 * AI Lawyer - Spacing scale
 * 4px base unit for consistent layout
 */

const baseUnit = 4;

export const spacing = {
  xxs: baseUnit * 1,   // 4
  xs: baseUnit * 2,    // 8
  sm: baseUnit * 3,    // 12
  md: baseUnit * 4,    // 16
  lg: baseUnit * 5,    // 20
  xl: baseUnit * 6,    // 24
  xxl: baseUnit * 8,   // 32
  xxxl: baseUnit * 10, // 40
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export default { spacing, borderRadius };
