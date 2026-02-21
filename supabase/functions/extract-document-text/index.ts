// AI Lawyer - Extract text from uploaded document
// Input: { contentBase64: string, mimeType: string }
// Output: { text: string } or { error: string }
// Supports: text/plain (decode). image/* and PDF (Gemini). DOCX returns error.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeBase64ToUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

async function extractTextWithGemini(
  apiKey: string,
  contentBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const mime = mimeType === "image/png" ? "image/png" : mimeType === "image/jpeg" ? "image/jpeg" : "application/pdf";
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mime,
              data: contentBase64,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    }),
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  if (data?.error?.message) throw new Error(data.error.message);
  return text === "EMPTY" ? "" : text;
}

const IMAGE_PROMPT = "Extract all text from this image. Return only the raw extracted text, nothing else. If there is no text, return the word EMPTY.";
const PDF_PROMPT = "Extract all text from this PDF document. Return only the raw extracted text, nothing else. Preserve paragraphs and structure with line breaks. If the document is empty, return the word EMPTY.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { contentBase64, mimeType } = await req.json();
    if (!contentBase64 || typeof contentBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "contentBase64 required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const mime = (mimeType || "").toLowerCase();

    if (mime === "text/plain") {
      const text = decodeBase64ToUtf8(contentBase64).trim();
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mime === "image/png" || mime === "image/jpeg") {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Image extraction not configured (GEMINI_API_KEY)" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await extractTextWithGemini(apiKey, contentBase64, mime, IMAGE_PROMPT);
      return new Response(JSON.stringify({ text: text || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mime.includes("pdf") || mime === "application/pdf") {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "PDF extraction not configured (GEMINI_API_KEY)" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await extractTextWithGemini(apiKey, contentBase64, "application/pdf", PDF_PROMPT);
      return new Response(JSON.stringify({ text: text || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mime.includes("wordprocessing") || mime.includes("docx")) {
      return new Response(
        JSON.stringify({
          error: "DOCX extraction is not available yet. Use PDF, .txt, or paste the text.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unsupported file type. Use .txt or paste text." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Extraction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
