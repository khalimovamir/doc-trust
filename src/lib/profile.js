/**
 * AI Lawyer - Profile API (Supabase)
 * profiles table: full_name, email, age, avatar_url, preferred_language, jurisdiction_code
 */

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
 * Update profile
 */
export async function updateProfile(userId, updates) {
  if (!userId) throw new Error('User ID required');
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Upload avatar to storage, return public URL (does not update profile)
 */
export async function uploadAvatar(userId, localUri) {
  if (!userId) throw new Error('User ID required');
  const ext = localUri.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, blob, {
      contentType: `image/${ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext}`,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}
