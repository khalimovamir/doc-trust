/**
 * Guest chat storage (AsyncStorage).
 * Chats and messages for unauthenticated users. Migrated to Supabase on sign-in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_CHATS_DATA_KEY = '@doctrust_guest_chats_data';

function genId() {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function getData() {
  try {
    const raw = await AsyncStorage.getItem(GUEST_CHATS_DATA_KEY);
    if (!raw) return { chats: [], messagesByChatId: {} };
    const data = JSON.parse(raw);
    return {
      chats: Array.isArray(data.chats) ? data.chats : [],
      messagesByChatId: data.messagesByChatId && typeof data.messagesByChatId === 'object' ? data.messagesByChatId : {},
    };
  } catch {
    return { chats: [], messagesByChatId: {} };
  }
}

async function setData(data) {
  await AsyncStorage.setItem(GUEST_CHATS_DATA_KEY, JSON.stringify(data));
}

/**
 * @returns {Promise<Array<{ id, title, context_type?, context_title?, context_data?, created_at, updated_at }>>}
 */
export async function getGuestChats() {
  const { chats } = await getData();
  return [...chats].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
}

/**
 * @param {string} chatId
 * @returns {Promise<{ id, title, context_type?, context_title?, context_data? }|null>}
 */
export async function getGuestChat(chatId) {
  if (!chatId) return null;
  const { chats } = await getData();
  return chats.find((c) => c.id === chatId) || null;
}

/**
 * @param {string} chatId
 * @returns {Promise<Array<{ id, role, content, image_url?, created_at }>>}
 */
export async function getGuestChatMessages(chatId) {
  if (!chatId) return [];
  const { messagesByChatId } = await getData();
  const list = messagesByChatId[chatId];
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
}

/**
 * @returns {Promise<{ id, title, context_type?, context_title?, context_data? }|null>}
 */
export async function getGuestMostRecentChat() {
  const chats = await getGuestChats();
  return chats[0] || null;
}

/**
 * @param {string} [title]
 * @param {Object} [context] - { context_type, context_title, context_data }
 * @returns {Promise<{ id, title, context_type?, context_title?, context_data?, created_at, updated_at }>}
 */
export async function createGuestChat(title = 'New chat', context = null) {
  const now = new Date().toISOString();
  const chat = {
    id: genId(),
    title: (title || 'New chat').slice(0, 100),
    context_type: context?.context_type ?? null,
    context_title: context?.context_title ? String(context.context_title).slice(0, 200) : null,
    context_data: context?.context_data ?? null,
    created_at: now,
    updated_at: now,
  };
  const data = await getData();
  data.chats.unshift(chat);
  data.messagesByChatId[chat.id] = [];
  await setData(data);
  return chat;
}

/**
 * @param {string} chatId
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @param {string} [imageUrl] - data URI or URL for guest (stored as-is)
 * @returns {Promise<{ id, role, content, image_url?, created_at }>}
 */
export async function addGuestChatMessage(chatId, role, content, imageUrl = null) {
  if (!chatId) throw new Error('chatId required');
  const now = new Date().toISOString();
  const msg = {
    id: genId(),
    role,
    content: String(content || ''),
    created_at: now,
    ...(imageUrl && { image_url: imageUrl }),
  };
  const data = await getData();
  if (!data.messagesByChatId[chatId]) data.messagesByChatId[chatId] = [];
  data.messagesByChatId[chatId].push(msg);
  const chat = data.chats.find((c) => c.id === chatId);
  if (chat) {
    chat.updated_at = now;
  }
  await setData(data);
  return msg;
}

/**
 * @param {string} chatId
 * @param {string} title
 */
export async function updateGuestChatTitle(chatId, title) {
  const data = await getData();
  const chat = data.chats.find((c) => c.id === chatId);
  if (chat) {
    chat.title = (title || chat.title).slice(0, 100);
    chat.updated_at = new Date().toISOString();
    await setData(data);
  }
}

/**
 * @param {string} chatId
 */
export async function deleteGuestChat(chatId) {
  const data = await getData();
  data.chats = data.chats.filter((c) => c.id !== chatId);
  delete data.messagesByChatId[chatId];
  await setData(data);
}

/**
 * Get last message of a guest chat (for list preview).
 * @param {string} chatId
 * @returns {Promise<{ content, created_at }|null>}
 */
export async function getGuestChatLastMessage(chatId) {
  const msgs = await getGuestChatMessages(chatId);
  return msgs.length > 0 ? { content: msgs[msgs.length - 1].content, created_at: msgs[msgs.length - 1].created_at } : null;
}

/**
 * Clear all guest chat data (after migration to Supabase).
 */
export async function clearGuestChats() {
  await AsyncStorage.removeItem(GUEST_CHATS_DATA_KEY);
}

/**
 * Copy guest chats and messages to Supabase for the given user (on sign-in).
 * Local guest data is kept so the app works two-way: guest ↔ Supabase.
 * Image URLs from guest (data URIs) are not uploaded; messages get image_url = null.
 * @param {string} userId - Supabase user id
 * @param {Object} chatApi - { createChat, addChatMessage } from '../lib/chat'
 */
export async function migrateGuestChatsToSupabase(userId, chatApi) {
  if (!userId || !chatApi?.createChat || !chatApi?.addChatMessage) return;
  const guestChats = await getGuestChats();
  if (guestChats.length === 0) return;
  for (const chat of guestChats) {
    try {
      const context = [chat.context_type, chat.context_title, chat.context_data].some(Boolean)
        ? {
            context_type: chat.context_type || null,
            context_title: chat.context_title || null,
            context_data: chat.context_data || null,
          }
        : null;
      const created = await chatApi.createChat(userId, chat.title || 'New chat', context, null);
      const msgs = await getGuestChatMessages(chat.id);
      for (const m of msgs) {
        await chatApi.addChatMessage(created.id, m.role, m.content, null, m.image_url && m.image_url.startsWith('http') ? m.image_url : null);
      }
    } catch (e) {
      console.warn('Guest chat migrate failed for', chat.id, e?.message);
    }
  }
  // Do not clear guest chats: keep local data for two-way guest ↔ Supabase behaviour.
}
