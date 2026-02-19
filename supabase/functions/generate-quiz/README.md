# generate-quiz (Supabase Edge Function)

Generates multiple-choice quizzes using Gemini AI, with cache-first and instant-play from the database to reduce cost and latency.

---

## Overview

- **Method:** `POST` only
- **Auth:** Required. Send `Authorization: Bearer <access_token>` (Supabase JWT).
- **Response (success):** Gzip-compressed JSON body with `Content-Type: application/json` and `Content-Encoding: gzip`. Clients must decompress to get the JSON payload.

---

## Request Body

| Field           | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `topic`        | string   | Yes      | Quiz topic (max 50 chars). Blocklisted terms are replaced with "General Science". |
| `difficulty`   | string   | Yes      | `"easy"` \| `"medium"` \| `"hard"` |
| `userFocus`    | string   | No       | Exam context (e.g. "SSC CGL", "Banking", "UPSC"). Default: `"General Knowledge"`. |
| `questionCount`| number   | No       | `5`, `10`, `15`, or `20`. Default: `5`. |
| `examType`     | string   | No       | Optional. |
| `examContext`  | string   | No       | Optional. |

---

## Flow (high level)

1. **Auth** – Validates JWT; uses Supabase client with that token so RLS applies.
2. **Validation** – Topic length, blocklist, difficulty; `questionCount` restricted to allowed values.
3. **Rate limit** – Uses `profiles.last_quiz_generated_at`; blocks new generation for **60 seconds** after the last one (returns `429`).
4. **Cache** – Looks for an existing unattempted quiz for the same topic + difficulty; if found, returns its questions (`source: "cache"`).
5. **Instant play** – Calls RPC `get_random_questions` for the user; if enough questions exist, creates a new quiz record, links those questions, returns them (`source: "generated"`).
6. **AI generation** – If not enough from cache/DB: calls **Gemini** with structured output, parses response, inserts into `generated_quizzes` and `questions`, updates `profiles.last_quiz_generated_at`, returns new quiz (`source: "generated"`).

---

## Gemini integration

- **Model:** `gemini-flash-latest` (override via env `GEMINI_MODEL`).
- **Structured output:** 6 params per question (industry-style, no explanation):
  - `question` (string)
  - `option_1`, `option_2`, `option_3`, `option_4` (strings)
  - `correct_answer` (integer 0–3)
- **Schema:** `responseSchema` in `generationConfig` enforces this shape.
- **Request:** We send `Accept-Encoding: gzip` so Gemini may return a compressed response.
- **Response handling:** We read the body with `getResponseBodyAsText(response)`; if `Content-Encoding: gzip`, we decompress with `DecompressionStream('gzip')` before parsing JSON.
- **Storage:** After decompressing (if needed) and parsing, we store each question as **plain text** in the DB (`question_text`, `options`); no explanation is stored for newly generated questions.

---

## Response payload (after decompressing)

Success response body (after gzip decompression) is JSON like:

```json
{
  "success": true,
  "quizId": "<uuid>",
  "source": "cache" | "generated",
  "quiz": { "quizId": "<uuid>", "questions": [...] },
  "questions": [
    {
      "id": "<uuid>",
      "question": "<string>",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "difficulty": "medium",
      "explanation": ""
    }
  ]
}
```

- `explanation` is empty for new questions; may be present for cached/legacy rows.

---

## Environment variables

| Variable               | Purpose |
|------------------------|---------|
| `GEMINI_API_KEY`       | Required for AI generation. |
| `GEMINI_MODEL`         | Optional. Default: `gemini-flash-latest`. |
| `SUPABASE_URL`         | Set by Supabase. |
| `SUPABASE_ANON_KEY`    | Set by Supabase. |

---

## Error responses

- **401** – Missing or invalid `Authorization` header / token.
- **429** – Rate limit (wait 60s after last quiz generation); body includes a friendly message and `Retry-After`.
- **4xx/5xx** – JSON body with `error` and optional `details`.

Error responses are **not** gzip-compressed; only successful quiz payloads use gzip.

---

## Client usage

- **Expo app:** Uses `supabase.functions.invoke('generate-quiz', { body: {...} })`. Browser fetch typically decompresses `Content-Encoding: gzip` automatically, so `data` is already the parsed object.
- **Website API route:** `website/app/api/quiz/start/route.ts` checks `Content-Encoding: gzip` and, when present, decompresses with Node’s `gunzipSync` before parsing JSON.

This README is the source of context for the generate-quiz function in this codebase.
