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

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(data?.error?.message || "Gemini no response");
  return text;
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
    const comparePrompt = buildComparePrompt(languageStr, jurisdictionStr);
    const fullPrompt = comparePrompt + document1.slice(0, 60000) + doc2Label + document2.slice(0, 60000);
    const raw = await callGemini(apiKey, fullPrompt);
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compare-documents error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Comparison failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
