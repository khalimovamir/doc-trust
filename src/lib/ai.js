/**
 * AI Lawyer - Invoke Supabase Edge Functions (Gemini)
 * analyze-document, compare-documents, chat
 */

import { supabase } from './supabase';

/**
 * Analyze a single document (legal risks, summary, guidance)
 * @param {string} documentText - Raw document text
 * @returns {Promise<Object>} { summary, redFlags, guidance, score, ... }
 */
function getErrorMessage(error, data) {
  // Response body often contains the real error
  if (data?.error) return String(data.error);
  const body = error?.context?.body ?? error?.context?.json;
  if (body) {
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (parsed?.error) return String(parsed.error);
    } catch (_) {}
  }
  if (error?.message && !error.message.includes('non-2xx')) return error.message;
  return 'Analysis failed. Check that GEMINI_API_KEY is set in Supabase Edge Function secrets.';
}

/**
 * @param {string} documentText
 * @param {{ jurisdiction?: string, language?: string }} [options] - language: e.g. "en", "ru" (app locale)
 */
export async function analyzeDocument(documentText, options) {
  const jurisdiction = options?.jurisdiction || 'US';
  const language = options?.language || 'en';
  const { data, error } = await supabase.functions.invoke('analyze-document', {
    body: {
      documentText: String(documentText || ''),
      jurisdiction: String(jurisdiction),
      language: String(language),
    },
  });
  if (error) throw new Error(getErrorMessage(error, data));
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Compare two documents
 * @param {string} document1 - Original document text
 * @param {string} document2 - Revised document text
 * @param {{ jurisdiction?: string, language?: string }} [options]
 * @returns {Promise<Object>} { summary, differences }
 */
export async function compareDocuments(document1, document2, options = {}) {
  const jurisdiction = options?.jurisdiction || 'US';
  const language = options?.language || 'en';
  const { data, error } = await supabase.functions.invoke('compare-documents', {
    body: {
      document1: String(document1 || ''),
      document2: String(document2 || ''),
      jurisdiction: String(jurisdiction),
      language: String(language),
    },
  });
  if (error) throw new Error(getErrorMessage(error, data));
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Chat with AI Lawyer
 * @param {Array<{role: 'user'|'assistant', text: string}>} messages - Chat history
 * @param {{ relatedContext?: string, imageBase64?: string, language?: string, jurisdiction?: string }} [options]
 * @returns {Promise<string>} Assistant reply text
 */
export async function chat(messages, options) {
  const relatedContext = options?.relatedContext;
  const imageBase64 = options?.imageBase64;
  const language = options?.language || 'en';
  const jurisdiction = options?.jurisdiction || 'US';
  const body = {
    messages: messages.map((m) => ({
      role: m.role,
      text: m.text || m.content || '',
    })),
    language: String(language),
    jurisdiction: String(jurisdiction),
  };
  if (relatedContext) body.relatedContext = relatedContext;
  if (imageBase64) body.imageBase64 = imageBase64;
  const { data, error } = await supabase.functions.invoke('chat', { body });
  if (error) throw new Error(getErrorMessage(error, data));
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Chat failed');
  return data?.text ?? '';
}
