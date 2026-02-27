// AI Lawyer - Chat Edge Function
// Uses Gemini API for legal Q&A
// Input: { messages: [{ role: "user"|"model", parts: [{ text: string }] }] }
// Output: { text: string }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_TEMPLATE = (language: string, jurisdiction: string, hasDocumentContext: boolean) => {
  const langMap: Record<string, string> = {
    en: "English", ru: "Russian", es: "Spanish", de: "German", fr: "French",
    it: "Italian", pt: "Portuguese", uk: "Ukrainian", pl: "Polish", tr: "Turkish",
    zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
  };
  const langName = langMap[language] || language || "English";
  const jurisdictionNote = jurisdiction
    ? `The user's jurisdiction is: ${jurisdiction}. Prefer guidance relevant to this jurisdiction when applicable; otherwise note that laws vary by region.`
    : "When discussing jurisdiction-specific matters, note that laws vary by region.";
  const documentContextRule = hasDocumentContext
    ? "When document/analysis context is provided with the user's question: answer directly from that context. Do NOT ask the user for clarification or more details—use the context (summary, issues, guidance) to interpret questions (e.g. 'first error' = first issue in the document, 'describe the risk' = from the listed issues). Give a direct, concise answer."
    : "";
  return `You are an AI Lawyer assistant. Give SHORT, correct answers. Be helpful but avoid long paragraphs.
- Prefer 1–3 short sentences or bullet points. No long introductions or repetition.
- Focus on the key point; skip filler. ${jurisdictionNote}
${documentContextRule}
- Never give final legal advice - recommend consulting a licensed attorney for binding decisions.
Always respond in ${langName}. All your messages must be written in ${langName}.`;
};

async function callGemini(apiKey: string, contents: unknown[], systemPrompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: m.parts,
      })),
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
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
    const { messages, relatedContext, imageBase64, language, jurisdiction } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let contents = messages.map((m: { role: string; text?: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text || m.content || "" }],
    }));

    if (relatedContext && typeof relatedContext === "string" && contents.length > 0) {
      const last = contents[contents.length - 1];
      if (last.role === "user") {
        const prefix = "The user's question below is related to the following context. Use it to give a relevant answer.\n\n--- Context ---\n" + relatedContext + "\n--- End context ---\n\nUser's question: ";
        contents = [
          ...contents.slice(0, -1),
          { ...last, parts: [{ text: prefix + (last.parts?.[0]?.text || "") }] },
        ];
      }
    }

    if (imageBase64 && typeof imageBase64 === "string" && contents.length > 0) {
      const last = contents[contents.length - 1];
      if (last.role === "user") {
        let rawBase64 = imageBase64.trim();
        let mimeType = "image/jpeg";
        const dataUriMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUriMatch) {
          mimeType = dataUriMatch[1].trim();
          rawBase64 = dataUriMatch[2];
        }
        const userText = (last.parts?.[0] as { text?: string })?.text || "";
        contents = [
          ...contents.slice(0, -1),
          {
            ...last,
            parts: [
              { inline_data: { mime_type: mimeType, data: rawBase64 } },
              { text: userText || "What do you see in this image? Please describe or analyze it." },
            ],
          },
        ];
      }
    }

    const languageStr = typeof language === "string" ? language.trim().toLowerCase() || "en" : "en";
    const jurisdictionStr = typeof jurisdiction === "string" ? String(jurisdiction).trim() || "US" : "US";
    const hasDocumentContext = Boolean(relatedContext && typeof relatedContext === "string" && relatedContext.trim().length > 0);
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE(languageStr, jurisdictionStr, hasDocumentContext);
    const text = await callGemini(apiKey, contents, systemPrompt);
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Chat failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
