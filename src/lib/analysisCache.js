/**
 * Doc Trust - Offline cache for analyses
 * Caches last N full analyses so Details can be viewed without network.
 * History list is also cached so the list shows when offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = '@doctrust_analysis_';
const LIST_KEY = '@doctrust_analyses_list';
const MAX_CACHED_ANALYSES = 20;

/**
 * @param {string} analysisId
 * @returns {Promise<Object|null>} Cached analysis or null
 */
export async function getCachedAnalysis(analysisId) {
  if (!analysisId) return null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + analysisId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Store analysis in cache and evict oldest if over limit.
 * @param {string} analysisId
 * @param {Object} analysis
 * @param {string[]} currentListIds - current list of analysis ids (newest first) to maintain order
 */
export async function setCachedAnalysis(analysisId, analysis, currentListIds = []) {
  if (!analysisId || !analysis) return;
  try {
    await AsyncStorage.setItem(
      CACHE_KEY_PREFIX + analysisId,
      JSON.stringify(analysis)
    );
    const ids = [analysisId, ...currentListIds.filter((id) => id !== analysisId)].slice(0, MAX_CACHED_ANALYSES);
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify(ids));
    // Evict entries that fell out of the list
    const idSet = new Set(ids);
    for (const id of currentListIds) {
      if (!idSet.has(id)) await AsyncStorage.removeItem(CACHE_KEY_PREFIX + id);
    }
  } catch {
    // ignore
  }
}

/**
 * Get list of analysis ids in cache (newest first).
 * @returns {Promise<string[]>}
 */
export async function getCachedAnalysisIds() {
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Get cached history list items (for History screen offline).
 * Each item: { id, documentType, score, createdAt, risksCount, tipsCount }.
 * @returns {Promise<Array>}
 */
export async function getCachedAnalysesList() {
  const ids = await getCachedAnalysisIds();
  const list = [];
  for (const id of ids) {
    const a = await getCachedAnalysis(id);
    if (a) {
      list.push({
        id: a.id,
        documentType: a.documentType || 'Document',
        score: a.score ?? 0,
        createdAt: a.createdAt,
        risksCount: (a.redFlags || []).length,
        tipsCount: (a.guidance || []).length,
      });
    }
  }
  return list;
}

/**
 * Update the ordered list of cached ids (e.g. after fetching from API).
 * Does not remove cache entries; use when syncing list order.
 * @param {string[]} ids
 */
export async function setCachedAnalysisIds(ids) {
  try {
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify((ids || []).slice(0, MAX_CACHED_ANALYSES)));
  } catch {
    // ignore
  }
}

/**
 * Remove one analysis from cache (e.g. after delete in Supabase).
 * @param {string} analysisId
 */
export async function removeCachedAnalysis(analysisId) {
  if (!analysisId) return;
  try {
    await AsyncStorage.removeItem(CACHE_KEY_PREFIX + analysisId);
    const ids = await getCachedAnalysisIds();
    const next = ids.filter((id) => id !== analysisId);
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
