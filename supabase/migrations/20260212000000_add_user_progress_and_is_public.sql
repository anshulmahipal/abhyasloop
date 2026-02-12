-- ============================================
-- User Progress & Mock Test is_public
-- ============================================
-- Run in Supabase SQL Editor after create_mock_test_schema.sql

-- 1. Add is_public to mock_tests (default true so existing tests stay visible)
alter table mock_tests
  add column if not exists is_public boolean not null default true;

comment on column mock_tests.is_public is 'When true, test is visible to all. When false, only to assigned/paid users.';

-- 2. user_progress: track completed mock tests per user
create table if not exists user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mock_test_id uuid references mock_tests(id) on delete cascade not null,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, mock_test_id)
);

create index if not exists idx_user_progress_user_id on user_progress(user_id);
create index if not exists idx_user_progress_mock_test_id on user_progress(mock_test_id);
create index if not exists idx_user_progress_completed_at on user_progress(completed_at desc);

-- RLS for user_progress
alter table user_progress enable row level security;

-- Users can read their own progress
create policy "Users can read own progress"
  on user_progress for select
  using (auth.uid() = user_id);

-- Users can insert their own progress (on submit)
create policy "Users can insert own progress"
  on user_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own progress (e.g. retake - optional)
create policy "Users can update own progress"
  on user_progress for update
  using (auth.uid() = user_id);
