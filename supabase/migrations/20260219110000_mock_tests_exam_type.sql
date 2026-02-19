-- Ensure mock_tests has exam_type for app inserts (client + generate-exam edge function).
-- Fixes PGRST204: "Could not find the 'exam_type' column of 'mock_tests' in the schema cache"

alter table mock_tests
  add column if not exists exam_type text default 'AI_TOPIC';

comment on column mock_tests.exam_type is 'e.g. AI_TOPIC, UPSC_PRELIMS_MINI; null for legacy.';
