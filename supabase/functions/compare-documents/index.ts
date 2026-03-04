// AI Lawyer - Compare Documents Edge Function
// Uses Gemini API
// Input: { document1: string, document2: string }
// Output: { summary, differences: [...] }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ru: "Russian", es: "Spanish", de: "German", fr: "French",
  it: "Italian", pt: "Portuguese", uk: "Ukrainian", pl: "Polish", tr: "Turkish",
  zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
};

function buildComparePrompt(language: string, jurisdiction: string): string {
  const langName = LANGUAGE_NAMES[language] || language || "English";
  return `You are an expert legal analyst. The user's jurisdiction is: ${jurisdiction || "US"}. Consider it when assessing significance of changes.
Write the entire JSON response (summary and all difference fields) in ${langName}. User's app language is ${language}.

Compare these two documents and return a JSON object (no markdown, no code blocks) with this structure:

{
  "summary": "Brief summary of main differences",
  "differences": [
    {
      "id": "string",
      "type": "added" | "removed" | "changed",
      "section": "string",
      "title": "string",
      "document1": "what's in doc 1 or null",
      "document2": "what's in doc 2 or null",
      "significance": "why it matters"
    }
  ]
}

Document 1 (original):
`;
}
const doc2Label = `

Document 2 (revised):
`;

/** Ask Gemini if both inputs are real documents suitable for comparison. */
function validationPrompt(sample1: string, sample2: string): string {
  return `You are a classifier. For each of the two inputs below, decide if it is a REAL DOCUMENT (contract, agreement, letter, terms, legal text) or NOT (few words, empty, junk, unrelated).
Reply with ONLY a JSON object: {"document1": true|false, "document2": true|false}

Input 1 (first 2000 chars):
${sample1}

Input 2 (first 2000 chars):
${sample2}`;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(data?.error?.message || "Gemini no response");
  return text;
}

/** Try to parse JSON; on failure try to recover truncated or slightly malformed response. */
function safeParseCompareResponse(jsonStr: string): { summary: string; differences: unknown[] } | null {
  const trimmed = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const out = JSON.parse(trimmed);
    if (out && typeof out.summary === "string" && Array.isArray(out.differences)) return out;
    return null;
  } catch (_) {
    // Often Gemini truncates or emits unescaped newlines → unterminated string. Try to recover.
    const lastComplete = trimmed.lastIndexOf('"}');
    if (lastComplete !== -1) {
      const candidate = trimmed.slice(0, lastComplete + 2) + "}]}";
      try {
        const out = JSON.parse(candidate);
        if (out && typeof out.summary === "string" && Array.isArray(out.differences)) return out;
      } catch (_) {}
    }
    const alt = trimmed.lastIndexOf("}");
    if (alt !== -1) {
      try {
        const out = JSON.parse(trimmed.slice(0, alt + 1));
        if (out && typeof out.summary === "string" && Array.isArray(out.differences)) return out;
      } catch (_) {}
    }
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { document1, document2, language, jurisdiction } = await req.json();
    if (!document1 || !document2) {
      return new Response(
        JSON.stringify({ error: "document1 and document2 required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const languageStr = typeof language === "string" ? String(language).trim().toLowerCase() || "en" : "en";
    const jurisdictionStr = typeof jurisdiction === "string" ? String(jurisdiction).trim() || "US" : "US";

    const sample1 = String(document1).trim().slice(0, 2000);
    const sample2 = String(document2).trim().slice(0, 2000);
    const validationRaw = await callGemini(apiKey, validationPrompt(sample1, sample2));
    const validationStr = validationRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let doc1Valid = true;
    let doc2Valid = true;
    try {
      const val = JSON.parse(validationStr) as { document1?: boolean; document2?: boolean };
      doc1Valid = val?.document1 === true;
      doc2Valid = val?.document2 === true;
    } catch (_) {}
    if (!doc1Valid || !doc2Valid) {
      return new Response(
        JSON.stringify({ error: "NOT_A_DOCUMENT" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const comparePrompt = buildComparePrompt(languageStr, jurisdictionStr);
    const fullPrompt = comparePrompt + document1.slice(0, 60000) + doc2Label + document2.slice(0, 60000);
    const raw = await callGemini(apiKey, fullPrompt);
    const parsed = safeParseCompareResponse(raw);
    if (!parsed) {
      console.error("compare-documents: invalid or truncated JSON from Gemini (length:", raw?.length ?? 0, ")");
      return new Response(
        JSON.stringify({ error: "Comparison response invalid. Please try again with shorter documents or retry." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compare-documents error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Comparison failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
