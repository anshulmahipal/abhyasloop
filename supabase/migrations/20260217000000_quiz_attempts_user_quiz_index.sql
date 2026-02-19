-- Concurrency safety / pool strategy: efficient "not attempted by user" lookups.
-- Index supports: SELECT quiz_id FROM quiz_attempts WHERE user_id = $1
-- so the API can exclude these quiz IDs when picking an unattempted quiz.
create index if not exists idx_quiz_attempts_user_id_quiz_id
  on quiz_attempts (user_id, quiz_id);
