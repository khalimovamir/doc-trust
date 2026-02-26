/**
 * AI Lawyer - Locale-aware date formatting
 * Uses current app language so month names (and other date parts) are translated.
 */

import { getAppLanguageCode } from '../i18n';

/** Map app language code to BCP 47 locale for Intl (e.g. 'ru' -> 'ru', 'en' -> 'en') */
function getDateLocale() {
  const code = getAppLanguageCode();
  if (!code) return 'en';
  const map = { en: 'en', ru: 'ru', de: 'de', ko: 'ko', es: 'es', pt: 'pt', fr: 'fr', it: 'it', nl: 'nl', ar: 'ar' };
  return map[code] || code;
}

/**
 * Format date for list/card display: short month, day, year (e.g. "Feb 7, 2026" / "7 февр. 2026").
 * @param {string|Date} isoOrDate - ISO date string or Date instance
 * @returns {string}
 */
export function formatDateShort(isoOrDate) {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const locale = getDateLocale();
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format for chat card timestamp: "24 мая, 3:34 PM" (day month, time).
 * @param {string|Date} isoOrDate
 * @returns {string}
 */
export function formatChatCardTime(isoOrDate) {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const locale = getDateLocale();
  const datePart = d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const timePart = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
}

/**
 * Format date with time (e.g. for feature requests: "Feb 2026, 3:45 PM").
 * @param {string|Date} isoOrDate
 * @returns {string}
 */
export function formatDateWithTime(isoOrDate) {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const locale = getDateLocale();
  const datePart = d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

/**
 * Format a date string that may be ISO or already localized (e.g. "February 15, 2026").
 * If parsing succeeds, returns date formatted in current locale; otherwise returns original.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateLocalized(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const d = new Date(dateStr.trim());
  if (Number.isNaN(d.getTime())) return dateStr;
  const locale = getDateLocale();
  return d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
}
