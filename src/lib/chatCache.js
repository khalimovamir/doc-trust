/**
 * Doc Trust - Local cache for authenticated user's chats (Supabase mirror).
 * Data is always saved locally when fetched so the app works two-way and offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHATS_LIST_PREFIX = '@doctrust_chats_list_';
const CHAT_MSGS_PREFIX = '@doctrust_chat_msgs_';
const CHAT_META_PREFIX = '@doctrust_chat_meta_';
const MAX_CACHED_CHATS = 50;
const MAX_CACHED_MSG_ENTRIES = 100;

function safeJsonParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {string} userId
 * @returns {Promise<Array>} Cached chat list or []
 */
export async function getCachedChatsList(userId) {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(CHATS_LIST_PREFIX + userId);
  return safeJsonParse(raw, []);
}

/**
 * @param {string} userId
 * @param {Array} list
 */
export async function setCachedChatsList(userId, list) {
  if (!userId) return;
  const toSave = (list || []).slice(0, MAX_CACHED_CHATS);
  await AsyncStorage.setItem(CHATS_LIST_PREFIX + userId, JSON.stringify(toSave));
}

/**
 * @param {string} chatId
 * @returns {Promise<Array>} Cached messages or []
 */
export async function getCachedChatMessages(chatId) {
  if (!chatId) return [];
  const raw = await AsyncStorage.getItem(CHAT_MSGS_PREFIX + chatId);
  return safeJsonParse(raw, []);
}

/**
 * @param {string} chatId
 * @param {Array} msgs
 */
export async function setCachedChatMessages(chatId, msgs) {
  if (!chatId) return;
  const toSave = (msgs || []).slice(-MAX_CACHED_MSG_ENTRIES);
  await AsyncStorage.setItem(CHAT_MSGS_PREFIX + chatId, JSON.stringify(toSave));
}

/**
 * @param {string} chatId
 * @returns {Promise<Object|null>} Cached chat meta or null
 */
export async function getCachedChatMeta(chatId) {
  if (!chatId) return null;
  const raw = await AsyncStorage.getItem(CHAT_META_PREFIX + chatId);
  return safeJsonParse(raw, null);
}

/**
 * @param {string} chatId
 * @param {Object} meta
 */
export async function setCachedChatMeta(chatId, meta) {
  if (!chatId || !meta) return;
  await AsyncStorage.setItem(CHAT_META_PREFIX + chatId, JSON.stringify(meta));
}
