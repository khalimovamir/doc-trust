/**
 * Doc Trust - Chat persistence (Supabase)
 */

import { supabase } from './supabase';

/**
 * Create a new chat
 * @param {string} userId
 * @param {string} [title]
 * @param {Object} [context] - { context_type, context_title, context_data }
 */
export async function createChat(userId, title = 'New chat', context = null) {
  const row = {
    user_id: userId,
    title: (title || 'New chat').slice(0, 100),
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
 * Get user's chats, most recent first
 */
export async function getChats(userId) {
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

/**
 * Get a single chat by id
 */
export async function getChat(chatId) {
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, context_type, context_title, context_data')
    .eq('id', chatId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Get most recent chat (or null)
 */
export async function getMostRecentChat(userId) {
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, context_type, context_title, context_data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get messages for a chat
 */
export async function getChatMessages(chatId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at, context_ref, feedback, image_url')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
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
 * Update feedback (like/dislike) for an assistant message.
 * @param {string} messageId - chat_messages.id
 * @param {'like'|'dislike'|null} feedback
 */
export async function updateMessageFeedback(messageId, feedback) {
  const { error } = await supabase
    .from('chat_messages')
    .update({ feedback: feedback || null })
    .eq('id', messageId)
    .in('role', ['assistant']);
  if (error) throw error;
}

/**
 * Add a message to a chat
 * @param {string} [contextText] - context text shown in the message (from the context card); only text, no id
 * @param {string} [imageUrl] - public URL of image uploaded to chat-images bucket
 */
export async function addChatMessage(chatId, role, content, contextText = null, imageUrl = null) {
  const row = { chat_id: chatId, role, content };
  if (contextText) row.context_ref = String(contextText);
  if (imageUrl) row.image_url = imageUrl;
  const { data, error } = await supabase.from('chat_messages').insert(row).select('id, created_at, context_ref, image_url').single();
  if (error) throw error;
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
