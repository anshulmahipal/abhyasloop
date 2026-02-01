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


-- ============================================
-- COMPLETE DATABASE SCHEMA FOR ABHYASLOOP
-- ============================================
-- Run this entire script in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (User profiles)
-- ============================================
create table profiles (
  id uuid references auth.users primary key,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 2. GENERATED_QUIZZES TABLE (Quiz sessions)
-- ============================================
create table generated_quizzes (
  id uuid default uuid_generate_v4() primary key,
  topic text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null
);

-- ============================================
-- 3. QUESTIONS TABLE (Quiz questions)
-- ============================================
create table questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references generated_quizzes on delete cascade not null,
  question_text text not null,
  options jsonb not null, -- Stores ["Option A", "Option B", "Option C", "Option D"]
  correct_index integer not null check (correct_index >= 0 and correct_index <= 3),
  explanation text,
  topic text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 4. USER_ATTEMPTS TABLE (Quiz completion history)
-- ============================================
create table user_attempts (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references generated_quizzes on delete cascade not null,
  user_id uuid references auth.users not null,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) - Enable
-- ============================================
alter table profiles enable row level security;
alter table generated_quizzes enable row level security;
alter table questions enable row level security;
alter table user_attempts enable row level security;

-- ============================================
-- 6. RLS POLICIES - PROFILES
-- ============================================
create policy "Users can view their own profile" 
on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile" 
on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile" 
on profiles for insert with check (auth.uid() = id);

-- ============================================
-- 7. RLS POLICIES - GENERATED_QUIZZES
-- ============================================
create policy "Users can view their own quizzes" 
on generated_quizzes for select using (auth.uid() = user_id);

create policy "Users can create their own quizzes" 
on generated_quizzes for insert with check (auth.uid() = user_id);

-- ============================================
-- 8. RLS POLICIES - QUESTIONS
-- ============================================
create policy "Users can view questions for their quizzes" 
on questions for select using (
  exists (
    select 1 from generated_quizzes 
    where generated_quizzes.id = questions.quiz_id 
    and generated_quizzes.user_id = auth.uid()
  )
);

create policy "Users can create questions for their quizzes" 
on questions for insert with check (
  exists (
    select 1 from generated_quizzes 
    where generated_quizzes.id = questions.quiz_id 
    and generated_quizzes.user_id = auth.uid()
  )
);

-- ============================================
-- 9. RLS POLICIES - USER_ATTEMPTS
-- ============================================
create policy "Users can view their own attempts" 
on user_attempts for select using (auth.uid() = user_id);

create policy "Users can create their own attempts" 
on user_attempts for insert with check (auth.uid() = user_id);

-- ============================================
-- 10. INDEXES (Performance optimization)
-- ============================================
create index idx_generated_quizzes_user_id on generated_quizzes(user_id);
create index idx_generated_quizzes_created_at on generated_quizzes(created_at desc);
create index idx_questions_quiz_id on questions(quiz_id);
create index idx_questions_difficulty on questions(difficulty);
create index idx_user_attempts_user_id on user_attempts(user_id);
create index idx_user_attempts_quiz_id on user_attempts(quiz_id);
create index idx_user_attempts_completed_at on user_attempts(completed_at desc);

-- ============================================
-- 11. FUNCTION: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Create profile when user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();