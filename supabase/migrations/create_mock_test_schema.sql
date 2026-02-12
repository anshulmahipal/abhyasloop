-- ============================================
-- MOCK TEST GENERATOR SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor to create the Mock Test tables

-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. MOCK_TESTS TABLE
-- ============================================
create table if not exists mock_tests (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text not null unique,
  exam_type text not null, -- e.g., "UPSC_PRELIMS_MINI", "SSC_CGL_MINI"
  status text not null default 'BUILDING' check (status in ('BUILDING', 'READY', 'FAILED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  error_message text
);

-- ============================================
-- 2. TEST_SECTIONS TABLE
-- ============================================
create table if not exists test_sections (
  id uuid default uuid_generate_v4() primary key,
  mock_test_id uuid references mock_tests(id) on delete cascade not null,
  subject_name text not null, -- e.g., "History", "English"
  topic_name text not null, -- e.g., "Indian Freedom Struggle", "Reading Comprehension"
  question_count integer not null check (question_count > 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  order_index integer not null default 0 -- To maintain section order
);

-- ============================================
-- 3. MOCK_TEST_QUESTIONS TABLE
-- ============================================
create table if not exists mock_test_questions (
  id uuid default uuid_generate_v4() primary key,
  section_id uuid references test_sections(id) on delete cascade not null,
  question_text text not null,
  options jsonb not null, -- Array of 4 options: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer integer not null check (correct_answer >= 0 and correct_answer <= 3),
  explanation text,
  order_index integer not null default 0, -- Order within the section
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 4. INDEXES (Performance optimization)
-- ============================================
create index if not exists idx_mock_tests_slug on mock_tests(slug);
create index if not exists idx_mock_tests_status on mock_tests(status);
create index if not exists idx_mock_tests_exam_type on mock_tests(exam_type);
create index if not exists idx_test_sections_mock_test_id on test_sections(mock_test_id);
create index if not exists idx_test_sections_status on test_sections(status);
create index if not exists idx_mock_test_questions_section_id on mock_test_questions(section_id);
create index if not exists idx_mock_test_questions_order on mock_test_questions(section_id, order_index);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
alter table mock_tests enable row level security;
alter table test_sections enable row level security;
alter table mock_test_questions enable row level security;

-- Policy: Anyone can read mock tests (public exams)
create policy "Mock tests are publicly readable"
  on mock_tests for select
  using (true);

-- Policy: Only authenticated users can create mock tests (via Edge Function)
create policy "Authenticated users can create mock tests"
  on mock_tests for insert
  to authenticated
  with check (true);

-- Policy: Anyone can read test sections
create policy "Test sections are publicly readable"
  on test_sections for select
  using (true);

-- Policy: Only authenticated users can create test sections
create policy "Authenticated users can create test sections"
  on test_sections for insert
  to authenticated
  with check (true);

-- Policy: Anyone can read questions
create policy "Mock test questions are publicly readable"
  on mock_test_questions for select
  using (true);

-- Policy: Only authenticated users can create questions
create policy "Authenticated users can create questions"
  on mock_test_questions for insert
  to authenticated
  with check (true);

-- ============================================
-- 6. FUNCTION: Auto-update updated_at timestamp
-- ============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_mock_tests_updated_at
  before update on mock_tests
  for each row
  execute procedure update_updated_at_column();

create trigger update_test_sections_updated_at
  before update on test_sections
  for each row
  execute procedure update_updated_at_column();

-- ============================================
-- 7. FUNCTION: Update mock test status when all sections complete
-- ============================================
create or replace function check_mock_test_completion()
returns trigger as $$
declare
  total_sections integer;
  completed_sections integer;
  failed_sections integer;
begin
  -- Count sections for this mock test
  select count(*) into total_sections
  from test_sections
  where mock_test_id = new.mock_test_id;

  -- Count completed sections
  select count(*) into completed_sections
  from test_sections
  where mock_test_id = new.mock_test_id
  and status = 'COMPLETED';

  -- Count failed sections
  select count(*) into failed_sections
  from test_sections
  where mock_test_id = new.mock_test_id
  and status = 'FAILED';

  -- Update mock test status
  if completed_sections = total_sections then
    update mock_tests
    set status = 'READY', completed_at = timezone('utc'::text, now())
    where id = new.mock_test_id;
  elsif failed_sections > 0 then
    update mock_tests
    set status = 'FAILED'
    where id = new.mock_test_id;
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger: Check completion when section status changes
create trigger check_mock_test_completion_trigger
  after update of status on test_sections
  for each row
  when (old.status is distinct from new.status)
  execute procedure check_mock_test_completion();
