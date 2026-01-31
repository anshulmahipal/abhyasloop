🚀 Sprint 2: The AI Brain & Database
Sprint Goal: Connect the Frontend to Supabase and Gemini. By the end of this sprint, clicking "Start Quiz" will trigger a live AI call, generate unique questions, save them to the database, and serve them to the user.

Tech Stack:

Backend: Supabase (Postgres)

Serverless: Supabase Edge Functions (Deno/TypeScript)

AI: Gemini 1.5 Flash (via API)

✅ Task List
🔹 Task 1: The Database Schema (SQL)
Objective: Create the tables to store questions and user results.

Action: Open Supabase SQL Editor and run the schema script (provided below).

Tables: profiles, generated_quizzes, questions, user_attempts.

🔹 Task 2: The AI Edge Function ("The Brain")
Objective: Create a secure server-side function to talk to Gemini.

Action:

Set up Supabase CLI.

Create function supabase functions new generate-quiz.

Write the logic to:

Receive topic and difficulty.

Call Gemini API with a strict JSON system prompt.

Parse the JSON.

Insert questions into the questions table.

Return the questions to the Frontend.

🔹 Task 3: The API Client
Objective: Connect the React Native app to the Edge Function.

Action: Create lib/api.ts. Write a function fetchQuiz(topic, difficulty) that calls supabase.functions.invoke().

🔹 Task 4: Connect the UI
Objective: Remove mockData.json forever.

Action:

Update app/(protected)/quiz/[id].tsx.

Add a Loading State (Spinner) while AI generates.

Handle Error States (e.g., "AI is busy").