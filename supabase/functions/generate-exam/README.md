# generate-exam (Supabase Edge Function)

Generates an engagement-gated AI topic test and stores it in `mock_tests` with `is_completed: false`. Used by the app so users must complete an existing test for a topic before generating a new one.

---

## Overview

- **Method:** POST only
- **Auth:** Required. Send `Authorization: Bearer <access_token>`.
- **Response:** JSON (uncompressed) with `id`, `questions`, `success`.

---

## Request body

| Field        | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `topic`     | string | Yes      | Topic for the quiz (e.g. "Algebra").  |
| `difficulty`| string | Yes      | `"easy"` \| `"medium"` \| `"hard"`  |

---

## Flow

1. **Auth** – Validates JWT; uses `auth.getUser()` for `user_id` (body `userId` is ignored).
2. **Validation** – Topic non-empty; difficulty one of easy/medium/hard.
3. **Generation** – Calls Gemini with structured output (same 6-param schema as generate-quiz).
4. **Insert** – Inserts one row into `mock_tests` with `user_id`, `topic`, `question_data` (minified payload), `is_completed: false`, `status: 'READY'`, `exam_type: 'AI_TOPIC'`.
5. **Response** – Returns `{ id, success: true, questions }`.

---

## Response (success)

```json
{
  "id": "<uuid>",
  "success": true,
  "questions": [
    {
      "id": "q-1",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "difficulty": "medium",
      "explanation": ""
    }
  ]
}
```

---

## Environment variables

| Variable        | Purpose                |
|-----------------|------------------------|
| `GEMINI_API_KEY`| Required for AI.       |
| `GEMINI_MODEL`  | Optional. Default: gemini-flash-latest. |
| `SUPABASE_URL`  | Set by Supabase.       |
| `SUPABASE_ANON_KEY` | Set by Supabase.   |

---

## Errors

- **401** – Missing or invalid `Authorization`.
- **400** – Missing/invalid `topic` or `difficulty`.
- **500** – Gemini or DB error; body includes `error` and optional `details`.
