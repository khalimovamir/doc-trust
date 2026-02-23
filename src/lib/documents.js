/**
 * Doc Trust - Document & Analysis persistence (Supabase)
 * Schema: documents -> document_versions -> analyses -> analysis_issues, analysis_guidance_items
 * Offline: analysisCache for last N analyses (see getAnalysisByIdCached, getAnalysesForUserWithCache).
 */

import { supabase } from './supabase';
import {
  getCachedAnalysis,
  setCachedAnalysis,
  getCachedAnalysisIds,
  setCachedAnalysisIds,
  getCachedAnalysesList,
} from './analysisCache';

function mapDocType(documentType) {
  const t = (documentType || '').toLowerCase();
  if (t.includes('freelance')) return 'freelance_contract';
  if (t.includes('deal')) return 'deal_contract';
  if (t.includes('work') || t.includes('employment')) return 'work_contract';
  return 'other';
}

/** Normalize to analysis_issues.severity: critical | warning | tip */
function normalizeIssueSeverity(type) {
  const t = String(type || 'tip').toLowerCase();
  if (t === 'critical' || t === 'warning' || t === 'tip') return t;
  if (t === 'high') return 'critical';
  if (t === 'medium') return 'warning';
  return 'tip';
}

/** Normalize to analysis_guidance_items.priority: high | medium | low */
function normalizeGuidancePriority(severity) {
  const s = String(severity || 'medium').toLowerCase();
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  return 'medium';
}

/**
 * Save document with version and full analysis to Supabase
 * @param {string} userId - auth.uid()
 * @param {string} documentText - raw text
 * @param {'paste'|'upload'|'scan'} source
 * @param {Object} analysisResult - from Edge Function: summary, documentType, parties, contractAmount, payments, keyDates, score, redFlags, guidance
 * @returns {{ documentId, documentVersionId, analysisId, analysis }}
 */
export async function saveDocumentWithAnalysis(userId, documentText, source, analysisResult) {
  if (!userId || !documentText || !source || !analysisResult) {
    throw new Error('Missing required params for saveDocumentWithAnalysis');
  }

  const title = (analysisResult.documentType || 'Document').slice(0, 200);
  const docType = mapDocType(analysisResult.documentType);
  const sourceNorm = ['paste', 'upload', 'scan'].includes(String(source).toLowerCase())
    ? String(source).toLowerCase()
    : 'paste';

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({ owner_id: userId, title, doc_type: docType })
    .select('id')
    .single();
  if (docErr) throw docErr;

  const { data: ver, error: verErr } = await supabase
    .from('document_versions')
    .insert({
      document_id: doc.id,
      source: sourceNorm,
      text_content: String(documentText || ''),
    })
    .select('id')
    .single();
  if (verErr) throw new Error(`document_versions: ${verErr.message}`);

  const redFlags = Array.isArray(analysisResult.redFlags) ? analysisResult.redFlags : [];
  const guidance = Array.isArray(analysisResult.guidance) ? analysisResult.guidance : [];
  const criticalCount = redFlags.filter((r) => normalizeIssueSeverity(r.type) === 'critical').length;
  const warningCount = redFlags.filter((r) => normalizeIssueSeverity(r.type) === 'warning').length;
  const tipCount = redFlags.filter((r) => normalizeIssueSeverity(r.type) === 'tip').length;
  const score = Math.max(0, Math.min(100, Number(analysisResult.score) || 0));

  const { data: analysisRow, error: analysisErr } = await supabase
    .from('analyses')
    .insert({
      document_version_id: ver.id,
      score,
      critical_count: criticalCount,
      warning_count: warningCount,
      tip_count: tipCount,
      risks_count: redFlags.length,
      tips_count: guidance.length,
      summary: analysisResult.summary ? String(analysisResult.summary) : null,
      document_type: analysisResult.documentType ? String(analysisResult.documentType) : null,
      parties: Array.isArray(analysisResult.parties) ? analysisResult.parties : [],
      contract_amount: analysisResult.contractAmount != null ? analysisResult.contractAmount : null,
      payments: Array.isArray(analysisResult.payments) ? analysisResult.payments : [],
      key_dates: Array.isArray(analysisResult.keyDates) ? analysisResult.keyDates : [],
    })
    .select('id')
    .single();
  if (analysisErr) throw new Error(`analyses: ${analysisErr.message}`);

  if (redFlags.length > 0) {
    const issues = redFlags.map((r, i) => ({
      analysis_id: analysisRow.id,
      severity: normalizeIssueSeverity(r.type),
      section: r.section != null ? String(r.section) : null,
      title: r.title != null ? String(r.title) : '',
      why_matters: r.whyMatters != null ? String(r.whyMatters) : null,
      what_to_do: r.whatToDo != null ? String(r.whatToDo) : null,
      order_index: i,
    }));
    const { error: issuesErr } = await supabase.from('analysis_issues').insert(issues);
    if (issuesErr) throw new Error(`analysis_issues: ${issuesErr.message}`);
  }

  if (guidance.length > 0) {
    const items = guidance.map((g, i) => ({
      analysis_id: analysisRow.id,
      priority: normalizeGuidancePriority(g.severity),
      section: g.section != null ? String(g.section) : null,
      text: g.text != null ? String(g.text) : '',
      is_done: false,
      order_index: i,
    }));
    const { data: guidanceRows, error: guidErr } = await supabase
      .from('analysis_guidance_items')
      .insert(items)
      .select('id, text, priority, section, is_done, order_index');
    if (guidErr) throw new Error(`analysis_guidance_items: ${guidErr.message}`);

    const guidanceForContext = (guidanceRows || []).map((row) => ({
      id: row.id,
      text: row.text,
      severity: row.priority,
      section: row.section,
      is_done: row.is_done,
    }));

    const issuesForContext = redFlags.map((r, i) => ({
      id: r.id || `issue-${i}`,
      type: r.type || 'tip',
      section: r.section || '',
      title: r.title || '',
      whyMatters: r.whyMatters || '',
      whatToDo: r.whatToDo || '',
    }));

    const analysis = {
      id: analysisRow.id,
      summary: analysisResult.summary,
      documentType: analysisResult.documentType,
      parties: analysisResult.parties || [],
      contractAmount: analysisResult.contractAmount,
      payments: analysisResult.payments || [],
      keyDates: analysisResult.keyDates || [],
      score,
      redFlags: issuesForContext,
      guidance: guidanceForContext,
    };

    return {
      documentId: doc.id,
      documentVersionId: ver.id,
      analysisId: analysisRow.id,
      analysis,
    };
  }

  const issuesForContext = redFlags.map((r, i) => ({
    id: r.id || `issue-${i}`,
    type: r.type || 'tip',
    section: r.section || '',
    title: r.title || '',
    whyMatters: r.whyMatters || '',
    whatToDo: r.whatToDo || '',
  }));

  const analysis = {
    id: analysisRow.id,
    summary: analysisResult.summary,
    documentType: analysisResult.documentType,
    parties: analysisResult.parties || [],
    contractAmount: analysisResult.contractAmount,
    payments: analysisResult.payments || [],
    keyDates: analysisResult.keyDates || [],
    score,
    redFlags: issuesForContext,
    guidance: [],
  };

  return {
    documentId: doc.id,
    documentVersionId: ver.id,
    analysisId: analysisRow.id,
    analysis,
  };
}

/**
 * List user's analyses for history (most recent first)
 * @param {string} userId
 * @returns {Array<{ id, documentType, score, createdAt }>}
 */
export async function getAnalysesForUser(userId) {
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('owner_id', userId);
  if (!docs?.length) return [];

  const docIds = docs.map((d) => d.id);
  const { data: versions } = await supabase
    .from('document_versions')
    .select('id')
    .in('document_id', docIds);
  if (!versions?.length) return [];

  const versionIds = versions.map((v) => v.id);
  const { data: analyses, error: aErr } = await supabase
    .from('analyses')
    .select('id, score, created_at, document_type, risks_count, tips_count')
    .in('document_version_id', versionIds)
    .order('created_at', { ascending: false })
    .limit(50);
  if (aErr) throw aErr;

  return (analyses || []).map((a) => ({
    id: a.id,
    documentType: a.document_type || 'Document',
    score: a.score ?? 0,
    createdAt: a.created_at,
    risksCount: a.risks_count ?? 0,
    tipsCount: a.tips_count ?? 0,
  }));
}

/**
 * Same as getAnalysesForUser but on network failure returns cached list (offline).
 * On success updates cache order (ids only).
 * @param {string} userId
 * @returns {Promise<Array<{ id, documentType, score, createdAt, risksCount, tipsCount }>>}
 */
export async function getAnalysesForUserWithCache(userId) {
  try {
    const list = await getAnalysesForUser(userId);
    await setCachedAnalysisIds(list.map((a) => a.id));
    return list;
  } catch {
    return getCachedAnalysesList();
  }
}

/**
 * Load full analysis by id (for reopen from history)
 * @param {string} analysisId
 * @returns {Object} analysis in format expected by DetailsScreen
 */
export async function getAnalysisById(analysisId) {
  const { data: a, error: aErr } = await supabase
    .from('analyses')
    .select('id, document_version_id, score, summary, document_type, parties, contract_amount, payments, key_dates, created_at')
    .eq('id', analysisId)
    .single();
  if (aErr || !a) throw aErr || new Error('Analysis not found');

  let text_content = '';
  let title = '';
  if (a.document_version_id) {
    const { data: ver } = await supabase
      .from('document_versions')
      .select('text_content, document_id')
      .eq('id', a.document_version_id)
      .single();
    text_content = ver?.text_content ?? '';
    if (ver?.document_id) {
      const { data: doc } = await supabase
        .from('documents')
        .select('title')
        .eq('id', ver.document_id)
        .single();
      title = doc?.title ?? '';
    }
  }

  const { data: issues } = await supabase
    .from('analysis_issues')
    .select('id, severity, section, title, why_matters, what_to_do')
    .eq('analysis_id', analysisId)
    .order('order_index');

  const { data: guidance } = await supabase
    .from('analysis_guidance_items')
    .select('id, text, priority, section, is_done')
    .eq('analysis_id', analysisId)
    .order('order_index');

  return {
    id: a.id,
    text_content,
    title,
    summary: a.summary,
    documentType: a.document_type,
    parties: a.parties || [],
    contractAmount: a.contract_amount,
    payments: a.payments || [],
    keyDates: a.key_dates || [],
    createdAt: a.created_at,
    score: a.score ?? 0,
    redFlags: (issues || []).map((r) => ({
      id: r.id,
      type: r.severity,
      section: r.section || '',
      title: r.title,
      whyMatters: r.why_matters || '',
      whatToDo: r.what_to_do || '',
    })),
    guidance: (guidance || []).map((g) => ({
      id: g.id,
      text: g.text,
      severity: g.priority,
      section: g.section,
      is_done: g.is_done,
    })),
  };
}

/**
 * Load full analysis by id with offline cache: try cache first, then network; on success write cache.
 * @param {string} analysisId
 * @returns {Promise<Object>} analysis in format expected by DetailsScreen
 */
export async function getAnalysisByIdCached(analysisId) {
  const cached = await getCachedAnalysis(analysisId);
  try {
    const analysis = await getAnalysisById(analysisId);
    const ids = await getCachedAnalysisIds();
    await setCachedAnalysis(analysisId, analysis, ids);
    return analysis;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

/**
 * Toggle guidance item done state
 * @param {string} itemId - analysis_guidance_items.id
 * @param {boolean} isDone
 */
export async function updateGuidanceItemDone(itemId, isDone) {
  const { error } = await supabase
    .from('analysis_guidance_items')
    .update({ is_done: !!isDone })
    .eq('id', itemId);
  if (error) throw error;
}
