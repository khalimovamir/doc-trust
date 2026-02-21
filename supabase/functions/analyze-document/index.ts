// AI Lawyer - Analyze Document Edge Function
// Uses Gemini API (GEMINI_API_KEY from Supabase secrets)
// Input: { documentText: string }
// Output: { summary, redFlags, guidance, score, documentType }

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

const analysisPrompt = (jurisdiction: string, language: string) => {
  const langName = LANGUAGE_NAMES[language] || language || "English";
  return `You are an expert legal analyst AI. Analyze the following document and return a valid JSON object only (no markdown, no code blocks). CRITICAL: Escape all quotes and newlines inside string values. Use \\n for line breaks in text.

IMPORTANT: The user's jurisdiction is: ${jurisdiction || "US"}. Consider laws, norms, and practices relevant to this jurisdiction when analyzing risks and giving guidance.

CRITICAL: Write ALL text in the response (summary, documentType, parties names/roles, contractAmount, payments labels/amounts, keyDates labels, redFlags title/whyMatters/whatToDo, guidance text) in ${langName}. The user's app language is ${language}; every string in the JSON must be in ${langName}.

Return this exact structure:

{"summary":"2-3 sentence summary","documentType":"Deal Contract or NDA etc","parties":[{"name":"","role":""}],"contractAmount":"$X or N/A","payments":[{"label":"","amount":""}],"keyDates":[{"date":"","label":""}],"score":50,"redFlags":[{"id":"1","type":"critical","section":"","title":"","whyMatters":"","whatToDo":""}],"guidance":[{"id":"1","text":"","severity":"high","section":""}]}

For redFlags, use type: "critical" for serious risks, "warning" for moderate issues, "tip" for minor suggestions. Include a mix of all three when applicable. Be concise. Focus on legal risks, unclear clauses, and actionable advice relevant to the user's jurisdiction. Document text:`;
};


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
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(data?.error?.message || "Gemini no response");
  return text;
}

function repairJSON(str: string): string {
  let s = str.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  // Trailing commas (Gemini often adds them) → "Expected property name or '}'"
  s = s.replace(/,(\s*[}\]])/g, "$1");
  // Double commas
  while (s.includes(",,")) s = s.replace(/,,/g, ",");
  // Newlines inside strings → "Unterminated string"
  s = s.replace(/\r?\n/g, " ");
  return s;
}

function safeParseJSON(str: string): Record<string, unknown> {
  const stripped = str.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const attempts = [stripped, repairJSON(str)];
  let lastErr: Error | null = null;
  for (const jsonStr of attempts) {
    if (!jsonStr) continue;
    try {
      return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("JSON parse failed");
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
    const { documentText, jurisdiction, language } = await req.json();
    if (!documentText || typeof documentText !== "string") {
      return new Response(
        JSON.stringify({ error: "documentText required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const jurisdictionStr = typeof jurisdiction === "string" ? jurisdiction.trim() || "US" : "US";
    const languageStr = typeof language === "string" ? language.trim().toLowerCase() || "en" : "en";
    const fullPrompt = analysisPrompt(jurisdictionStr, languageStr) + "\n\n" + documentText.slice(0, 120000);
    const raw = await callGemini(apiKey, fullPrompt);
    const parsed = safeParseJSON(raw);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("analyze-document error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
