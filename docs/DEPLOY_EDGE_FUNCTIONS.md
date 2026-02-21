# Deploy Edge Functions (Gemini)

Edge Functions use `GEMINI_API_KEY` from Supabase secrets.

## 1. Install Supabase CLI (if needed)

```bash
npm install -g supabase
```

## 2. Link project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

(Project ref from Supabase Dashboard → Settings → General)

## 3. Set secret (if not already set)

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

## 4. Deploy functions

```bash
supabase functions deploy analyze-document
supabase functions deploy compare-documents
supabase functions deploy chat
```

Or deploy all:

```bash
supabase functions deploy
```

## 5. Test locally (optional)

```bash
supabase functions serve
```

Then invoke with `http://localhost:54321/functions/v1/analyze-document` (use your local Supabase URL).
