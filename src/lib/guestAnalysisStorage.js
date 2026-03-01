/**
 * Guest analysis storage (AsyncStorage).
 * Analyses for unauthenticated users. Migrated to Supabase on sign-in; local data is kept (two-way).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_ANALYSES_KEY = '@doctrust_guest_analyses_data';

function genId() {
  return `guest_analysis_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function getData() {
  try {
    const raw = await AsyncStorage.getItem(GUEST_ANALYSES_KEY);
    if (!raw) return { list: [], byId: {} };
    const data = JSON.parse(raw);
    return {
      list: Array.isArray(data.list) ? data.list : [],
      byId: data.byId && typeof data.byId === 'object' ? data.byId : {},
    };
  } catch {
    return { list: [], byId: {} };
  }
}

async function setData(data) {
  await AsyncStorage.setItem(GUEST_ANALYSES_KEY, JSON.stringify(data));
}

/**
 * Build Details-style analysis from Edge Function result + documentText + source.
 * @param {Object} analysisResult - summary, documentType, parties, contractAmount, payments, keyDates, score, redFlags, guidance
 * @param {string} documentText
 * @param {string} source - 'paste'|'upload'|'scan'
 * @param {string} id
 * @param {string} createdAt - ISO string
 */
function buildFullAnalysis(analysisResult, documentText, source, id, createdAt) {
  const redFlags = Array.isArray(analysisResult.redFlags) ? analysisResult.redFlags : [];
  const guidance = Array.isArray(analysisResult.guidance) ? analysisResult.guidance : [];
  const title = (analysisResult.documentType || 'Document').slice(0, 200);
  return {
    id,
    text_content: String(documentText || ''),
    title,
    summary: analysisResult.summary ? String(analysisResult.summary) : null,
    documentType: analysisResult.documentType ? String(analysisResult.documentType) : null,
    parties: Array.isArray(analysisResult.parties) ? analysisResult.parties : [],
    contractAmount: analysisResult.contractAmount != null ? analysisResult.contractAmount : null,
    payments: Array.isArray(analysisResult.payments) ? analysisResult.payments : [],
    keyDates: Array.isArray(analysisResult.keyDates) ? analysisResult.keyDates : [],
    createdAt,
    score: Math.max(0, Math.min(100, Number(analysisResult.score) || 0)),
    redFlags: redFlags.map((r, i) => ({
      id: `guest_issue_${id}_${i}`,
      type: r.type === 'critical' || r.type === 'warning' || r.type === 'tip' ? r.type : 'tip',
      section: r.section != null ? String(r.section) : '',
      title: r.title != null ? String(r.title) : '',
      whyMatters: r.whyMatters != null ? String(r.whyMatters) : '',
      whatToDo: r.whatToDo != null ? String(r.whatToDo) : '',
    })),
    guidance: guidance.map((g, i) => ({
      id: `guest_guidance_${id}_${i}`,
      text: g.text != null ? String(g.text) : '',
      severity: g.severity === 'high' || g.severity === 'medium' || g.severity === 'low' ? g.severity : 'medium',
      section: g.section != null ? String(g.section) : null,
      is_done: false,
    })),
    _source: source,
  };
}

/**
 * @returns {Promise<Array<{ id, documentType, score, createdAt, risksCount, tipsCount }>>}
 */
export async function getGuestAnalysesList() {
  const { list } = await getData();
  return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/**
 * @param {string} analysisId
 * @returns {Promise<Object|null>} Full analysis in Details format or null
 */
export async function getGuestAnalysisById(analysisId) {
  if (!analysisId) return null;
  const { byId } = await getData();
  return byId[analysisId] || null;
}

/**
 * @param {Object} analysisResult - from Edge Function
 * @param {string} documentText
 * @param {string} source - 'paste'|'upload'|'scan'
 * @returns {Promise<{ id, documentType, score, createdAt, risksCount, tipsCount }>} List item + full analysis stored
 */
export async function saveGuestAnalysis(analysisResult, documentText, source) {
  const createdAt = new Date().toISOString();
  const id = genId();
  const redFlags = Array.isArray(analysisResult.redFlags) ? analysisResult.redFlags : [];
  const guidance = Array.isArray(analysisResult.guidance) ? analysisResult.guidance : [];
  const full = buildFullAnalysis(analysisResult, documentText, source, id, createdAt);
  const listItem = {
    id,
    documentType: full.documentType || 'Document',
    score: full.score ?? 0,
    createdAt: full.createdAt,
    risksCount: full.redFlags.length,
    tipsCount: full.guidance.length,
  };
  const data = await getData();
  data.list.unshift(listItem);
  data.byId[id] = full;
  await setData(data);
  return listItem;
}

/**
 * @param {string} analysisId
 */
export async function deleteGuestAnalysis(analysisId) {
  const data = await getData();
  data.list = data.list.filter((a) => a.id !== analysisId);
  delete data.byId[analysisId];
  await setData(data);
}

/**
 * Copy guest analyses to Supabase for the given user (on sign-in). Local data is kept (two-way).
 * @param {string} userId
 * @param {Object} api - { saveDocumentWithAnalysis }
 */
export async function migrateGuestAnalysesToSupabase(userId, api) {
  if (!userId || !api?.saveDocumentWithAnalysis) return;
  const { list, byId } = await getData();
  for (const item of list) {
    const full = byId[item.id];
    if (!full || !full.text_content) continue;
    const source = full._source || 'paste';
    const analysisResult = {
      summary: full.summary,
      documentType: full.documentType,
      parties: full.parties,
      contractAmount: full.contractAmount,
      payments: full.payments,
      keyDates: full.keyDates,
      score: full.score,
      redFlags: (full.redFlags || []).map((r) => ({
        type: r.type,
        section: r.section,
        title: r.title,
        whyMatters: r.whyMatters,
        whatToDo: r.whatToDo,
      })),
      guidance: (full.guidance || []).map((g) => ({
        text: g.text,
        severity: g.severity,
        section: g.section,
      })),
    };
    try {
      await api.saveDocumentWithAnalysis(userId, full.text_content, source, analysisResult);
    } catch (e) {
      console.warn('Guest analysis migrate failed for', item.id, e?.message);
    }
  }
  // Do not clear guest analyses (two-way).
}
