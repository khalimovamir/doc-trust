/**
 * Sync guest data to Supabase when user transitions from guest to signed-in.
 * - App State (guest AsyncStorage) → Supabase: migrate guest analyses and chats.
 * - Invalidates analysis and chat caches so next load fetches from Supabase (Supabase → App State).
 */

import { saveDocumentWithAnalysis } from './documents';
import { createChat, addChatMessage } from './chat';
import { migrateGuestAnalysesToSupabase } from './guestAnalysisStorage';
import { migrateGuestChatsToSupabase } from './guestChatStorage';
import { setCachedAnalysisIds } from './analysisCache';
import { setCachedChatsList } from './chatCache';

/**
 * Run when guest becomes signed-in: upload guest analyses and chats to Supabase,
 * then clear list caches so Home/History will load fresh data from Supabase.
 * @param {string} userId - Supabase auth user id
 */
export async function syncGuestToUserData(userId) {
  if (!userId) return;
  try {
    const guestToSupabase = await migrateGuestAnalysesToSupabase(userId, {
      saveDocumentWithAnalysis,
    });
    await migrateGuestChatsToSupabase(
      userId,
      { createChat, addChatMessage },
      guestToSupabase
    );
    await setCachedAnalysisIds([]);
    await setCachedChatsList(userId, []);
  } catch (e) {
    console.warn('Guest sync to user failed:', e?.message);
  }
}
