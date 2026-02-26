/**
 * AI Lawyer - Profile API (Supabase)
 * profiles table: full_name, email, age, avatar_url, preferred_language, jurisdiction_code
 * Storage: bucket "avatars", path {userId}/avatar.jpg (public read for avatar_url)
 */

import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const AVATARS_BUCKET = 'avatars';

/**
 * Get profile for current user
 */
export async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update profile (only defined fields; removes undefined)
 */
export async function updateProfile(userId, updates) {
  if (!userId) throw new Error('User ID required');
  const clean = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) clean[k] = v;
  }
  clean.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Upload avatar to Supabase Storage, return public URL (does not update profile).
 * Uses ArrayBuffer (from base64) for reliable uploads in React Native.
 * Uses expo-file-system so file:// and content:// URIs work on iOS and Android.
 */
export async function uploadAvatar(userId, localUri) {
  if (!userId) throw new Error('User ID required');
  if (!localUri || typeof localUri !== 'string') throw new Error('Image URI required');

  const extRaw = (localUri.split('.').pop() || '').split('?')[0].toLowerCase();
  const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extRaw) ? extRaw : 'jpg';
  const path = `${userId}/avatar.${ext === 'jpeg' ? 'jpg' : ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  if (!base64) throw new Error('Could not read image file');

  const body = base64ToArrayBuffer(base64);
  const contentType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, body, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw new Error(uploadError.message || 'Avatar upload failed');

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}
