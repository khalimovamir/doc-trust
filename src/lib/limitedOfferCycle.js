/**
 * Limited Offer banner visibility: 24h show, 24h hide, repeat (no Supabase).
 * Stored in AsyncStorage per device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LIMITED_OFFER_CYCLE_KEY = '@doctrust_limited_offer_cycle_start';
const CYCLE_MS = 48 * 60 * 60 * 1000; // 24h show + 24h hide
const SHOW_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней — старые данные сбрасываем

export function getBannerExpiresAt(cycleStartAt) {
  if (!cycleStartAt || typeof cycleStartAt !== 'number') return null;
  const elapsed = Date.now() - cycleStartAt;
  const positionInCycle = ((elapsed % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  if (positionInCycle >= SHOW_WINDOW_MS) return null; // in hide window
  const endOfShowWindow = cycleStartAt + Math.floor(elapsed / CYCLE_MS) * CYCLE_MS + SHOW_WINDOW_MS;
  return new Date(endOfShowWindow).toISOString();
}

export function isInShowWindow(cycleStartAt) {
  if (!cycleStartAt || typeof cycleStartAt !== 'number') return true; // first time: show
  const elapsed = Date.now() - cycleStartAt;
  const positionInCycle = ((elapsed % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  return positionInCycle < SHOW_WINDOW_MS;
}

export async function getLimitedOfferCycleStart() {
  try {
    const raw = await AsyncStorage.getItem(LIMITED_OFFER_CYCLE_KEY);
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const now = Date.now();
    if (n > now || now - n > MAX_AGE_MS) return null;
    return n;
  } catch {
    return null;
  }
}

export async function setLimitedOfferCycleStart(timestamp) {
  try {
    await AsyncStorage.setItem(LIMITED_OFFER_CYCLE_KEY, String(timestamp));
  } catch (_) {}
}

/** Ensure cycle start is set when banner is first shown; returns current cycle start for this session. */
export async function ensureCycleStart() {
  let start = await getLimitedOfferCycleStart();
  if (start == null) {
    start = Date.now();
    await setLimitedOfferCycleStart(start);
  }
  return start;
}
