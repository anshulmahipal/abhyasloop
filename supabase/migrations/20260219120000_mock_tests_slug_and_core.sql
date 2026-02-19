-- Ensure mock_tests has slug and other core columns for app/edge-function inserts.
-- Fixes PGRST204: "Could not find the 'slug' column of 'mock_tests' in the schema cache"

alter table mock_tests
  add column if not exists slug text;

comment on column mock_tests.slug is 'Unique URL-friendly identifier for the test.';

-- Ensure title and status exist (used by same inserts)
alter table mock_tests
  add column if not exists title text;

alter table mock_tests
  add column if not exists status text default 'READY';

comment on column mock_tests.title is 'Display title of the mock test.';
comment on column mock_tests.status is 'BUILDING, READY, or FAILED.';
