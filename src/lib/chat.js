/**
 * Doc Trust - Chat persistence (Supabase + local cache for two-way / offline)
 */

import { supabase } from './supabase';
import {
  getCachedChatsList,
  setCachedChatsList,
  getCachedChatMessages,
  setCachedChatMessages,
  getCachedChatMeta,
  setCachedChatMeta,
} from './chatCache';

/**
 * Find existing chat for this document analysis (from Details)
 * @param {string} userId
 * @param {string} analysisId - public.analyses.id
 * @returns {Promise<{ id, title, context_type, context_title, context_data }|null>}
 */
export async function getChatByAnalysisId(userId, analysisId) {
  if (!userId || !analysisId) return null;
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, context_type, context_title, context_data')
    .eq('user_id', userId)
    .eq('analysis_id', analysisId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Create a new chat
 * @param {string} userId
 * @param {string} [title]
 * @param {Object} [context] - { context_type, context_title, context_data }
 * @param {string} [analysisId] - link to document analysis (public.analyses.id)
 */
export async function createChat(userId, title = 'New chat', context = null, analysisId = null) {
  const row = {
    user_id: userId,
    title: (title || 'New chat').slice(0, 100),
    ...(analysisId && { analysis_id: analysisId }),
    ...(context && {
      context_type: context.context_type || null,
      context_title: context.context_title ? context.context_title.slice(0, 200) : null,
      context_data: context.context_data || null,
    }),
  };
  const { data, error } = await supabase.from('chats').insert(row).select('id, context_type, context_title, context_data').single();
  if (error) throw error;
  return data;
}

/**
 * Get user's chats, most recent first (with context for restoring when opening).
 * Saves to local cache on success; returns cache on network failure.
 */
export async function getChats(userId) {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('id, title, context_type, context_title, context_data, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const list = data || [];
    await setCachedChatsList(userId, list);
    return list;
  } catch (e) {
    const cached = await getCachedChatsList(userId);
    return cached;
  }
}

/**
 * Get a single chat by id. Saves to local cache on success; returns cache on failure.
 */
export async function getChat(chatId) {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('id, title, context_type, context_title, context_data')
      .eq('id', chatId)
      .single();
    if (error) throw error;
    if (data) await setCachedChatMeta(chatId, data);
    return data;
  } catch (e) {
    return await getCachedChatMeta(chatId);
  }
}

/**
 * Get most recent chat (or null). Uses cached list on network failure.
 */
export async function getMostRecentChat(userId) {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('id, title, context_type, context_title, context_data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (e) {
    const list = await getCachedChatsList(userId);
    return list[0] || null;
  }
}

/**
 * Get messages for a chat. Saves to local cache on success; returns cache on failure.
 */
export async function getChatMessages(chatId) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at, image_url')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const msgs = data || [];
    await setCachedChatMessages(chatId, msgs);
    return msgs;
  } catch (e) {
    return await getCachedChatMessages(chatId);
  }
}

/**
 * Get last message of a chat (for list preview). Uses cached messages on failure.
 */
export async function getChatLastMessage(chatId) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('content, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    const msgs = await getCachedChatMessages(chatId);
    return msgs.length > 0 ? { content: msgs[msgs.length - 1].content, created_at: msgs[msgs.length - 1].created_at } : null;
  }
}

const CHAT_IMAGES_BUCKET = 'chat-images';

/**
 * Upload image for chat message. Path: {userId}/{chatId}/{timestamp}.jpg
 * @param {string} userId
 * @param {string} chatId
 * @param {string} localUri - file:// URI from ImagePicker, or base64 string (data:... or raw base64)
 * @returns {Promise<string>} public URL of the uploaded image
 */
export async function uploadChatImage(userId, chatId, localUri) {
  const path = `${userId}/${chatId}/${Date.now()}.jpg`;
  let body;
  let contentType = 'image/jpeg';
  if (localUri.startsWith('data:')) {
    const [header, base64] = localUri.split(',');
    const m = header.match(/data:([^;]+)/);
    if (m) contentType = m[1].trim();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    body = bytes.buffer;
  } else if (localUri.startsWith('file://')) {
    const res = await fetch(localUri);
    body = await res.arrayBuffer();
  } else {
    const res = await fetch(localUri);
    body = await res.arrayBuffer();
  }
  const { data, error } = await supabase.storage
    .from(CHAT_IMAGES_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Add a message to a chat. Appends to local cache on success.
 * @param {string} [imageUrl] - public URL of image uploaded to chat-images bucket
 */
export async function addChatMessage(chatId, role, content, _contextText = null, imageUrl = null) {
  const row = { chat_id: chatId, role, content };
  if (imageUrl) row.image_url = imageUrl;
  const { data, error } = await supabase.from('chat_messages').insert(row).select('id, created_at, image_url').single();
  if (error) throw error;
  const existing = await getCachedChatMessages(chatId);
  const newMsg = { id: data.id, role, content, created_at: data.created_at, ...(data.image_url && { image_url: data.image_url }) };
  await setCachedChatMessages(chatId, [...existing, newMsg]);
  return data;
}

/**
 * Update chat title and updated_at
 */
export async function updateChatTitle(chatId, title) {
  await supabase
    .from('chats')
    .update({ title: title.slice(0, 100), updated_at: new Date().toISOString() })
    .eq('id', chatId);
}

/**
 * Delete a chat (and its messages via cascade)
 */
export async function deleteChat(chatId) {
  const { error } = await supabase.from('chats').delete().eq('id', chatId);
  if (error) throw error;
}

/**
 * Delete all messages in a chat except the first one (assistant greeting).
 */
export async function deleteMessagesExceptFirst(chatId) {
  const msgs = await getChatMessages(chatId);
  if (msgs.length <= 1) return;
  const firstId = msgs[0].id;
  const idsToDelete = msgs.slice(1).map((m) => m.id);
  const { error } = await supabase.from('chat_messages').delete().in('id', idsToDelete);
  if (error) throw error;
}
