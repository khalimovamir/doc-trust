/**
 * Feature requests: list, create, upvote (toggle).
 * Uses Supabase tables feature_requests and feature_request_votes.
 */

import { supabase } from './supabase';

/**
 * @returns {Promise<{ id: string, user_id: string, title: string, description: string, status: string, created_at: string, upvotes: number }[]>}
 */
export async function listFeatureRequests() {
  const { data, error } = await supabase.rpc('get_feature_requests_with_votes');

  if (error) throw error;
  return data ?? [];
}

/** @returns {Promise<number>} */
export async function getMyFeatureRequestCount(userId) {
  const { count, error } = await supabase
    .from('feature_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * @param {{ title: string, description: string }} payload
 * @param {string} userId
 * @returns {Promise<{ id: string }>}
 */
export async function createFeatureRequest(payload, userId) {
  const count = await getMyFeatureRequestCount(userId);
  if (count >= 2) {
    const e = new Error('You can submit up to 2 ideas.');
    e.code = 'FEATURE_REQUEST_LIMIT';
    throw e;
  }

  const { data, error } = await supabase
    .from('feature_requests')
    .insert({
      user_id: userId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get set of feature request ids the user has voted for.
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
export async function getMyVotedIds(userId) {
  const { data, error } = await supabase
    .from('feature_request_votes')
    .select('feature_request_id')
    .eq('user_id', userId);
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.feature_request_id));
}

/**
 * Toggle vote: if current user already voted, remove vote; otherwise add.
 * @param {string} featureRequestId
 * @param {string} userId
 * @returns {Promise<'added'|'removed'>}
 */
export async function toggleVote(featureRequestId, userId) {
  const { data: existing } = await supabase
    .from('feature_request_votes')
    .select('feature_request_id')
    .eq('feature_request_id', featureRequestId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('feature_request_votes')
      .delete()
      .eq('feature_request_id', featureRequestId)
      .eq('user_id', userId);
    return 'removed';
  }

  await supabase.from('feature_request_votes').insert({
    feature_request_id: featureRequestId,
    user_id: userId,
  });
  return 'added';
}
