-- ============================================
-- Engagement-gated AI tests: mock_tests columns
-- ============================================
-- Allows one unattempted AI test per user per topic; user must complete before generating a new one.

-- 1. is_completed: false until user finishes the test
alter table mock_tests
  add column if not exists is_completed boolean not null default false;

comment on column mock_tests.is_completed is 'When false, user has an unfinished test for this topic and cannot generate another.';

-- 2. user_id + topic: for engagement gate (nullable for legacy rows)
alter table mock_tests
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table mock_tests
  add column if not exists topic text;

comment on column mock_tests.user_id is 'Owner of this AI-generated topic test; null for legacy mock tests.';
comment on column mock_tests.topic is 'Topic of the test; null for legacy section-based mock tests.';

-- 3. question_data: minified JSON payload for resume (nullable for legacy)
alter table mock_tests
  add column if not exists question_data jsonb;

comment on column mock_tests.question_data is 'Stored quiz payload { questions: [...] } for resuming; null for legacy.';

-- 4. Index for the "unattempted per user+topic" check
create index if not exists idx_mock_tests_user_topic_incomplete
  on mock_tests (user_id, topic)
  where user_id is not null and topic is not null and is_completed = false;

-- 5. RLS: allow users to update their own engagement-gated tests (e.g. set is_completed)
drop policy if exists "Users can update own mock tests" on mock_tests;
create policy "Users can update own mock tests"
  on mock_tests for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
