| table_name          | column_name            | data_type                |
| ------------------- | ---------------------- | ------------------------ |
| exam_categories     | created_at             | timestamp with time zone |
| quiz_attempts       | id                     | uuid                     |
| quiz_attempts       | user_id                | uuid                     |
| quiz_attempts       | quiz_id                | uuid                     |
| quiz_attempts       | score                  | integer                  |
| quiz_attempts       | total_questions        | integer                  |
| quiz_attempts       | completed_at           | timestamp with time zone |
| quiz_attempts       | user_answers           | jsonb                    |
| exams               | topics                 | jsonb                    |
| exams               | is_active              | boolean                  |
| exams               | sort_order             | integer                  |
| exams               | category_id            | uuid                     |
| quiz_history        | id                     | uuid                     |
| quiz_history        | user_id                | uuid                     |
| quiz_history        | score                  | integer                  |
| quiz_history        | total_questions        | integer                  |
| quiz_history        | quiz_data              | jsonb                    |
| quiz_history        | created_at             | timestamp with time zone |
| mistakes            | id                     | bigint                   |
| mistakes            | user_id                | uuid                     |
| mistakes            | question_id            | uuid                     |
| mistakes            | review_count           | integer                  |
| mistakes            | is_mastered            | boolean                  |
| mistakes            | created_at             | timestamp with time zone |
| transactions        | id                     | uuid                     |
| transactions        | user_id                | uuid                     |
| transactions        | amount                 | integer                  |
| transactions        | created_at             | timestamp with time zone |
| app_feedback        | id                     | uuid                     |
| app_feedback        | user_id                | uuid                     |
| app_feedback        | created_at             | timestamp with time zone |
| question_reports    | id                     | uuid                     |
| question_reports    | user_id                | uuid                     |
| question_reports    | created_at             | timestamp with time zone |
| exam_categories     | id                     | uuid                     |
| exam_categories     | total_exams_count      | integer                  |
| generated_quizzes   | id                     | uuid                     |
| generated_quizzes   | created_at             | timestamp with time zone |
| generated_quizzes   | user_id                | uuid                     |
| questions           | id                     | uuid                     |
| questions           | quiz_id                | uuid                     |
| questions           | options                | jsonb                    |
| questions           | correct_index          | integer                  |
| questions           | created_at             | timestamp with time zone |
| user_seen_questions | id                     | uuid                     |
| user_seen_questions | user_id                | uuid                     |
| user_seen_questions | question_id            | uuid                     |
| user_seen_questions | seen_at                | timestamp with time zone |
| profiles            | id                     | uuid                     |
| profiles            | updated_at             | timestamp with time zone |
| profiles            | coins                  | integer                  |
| profiles            | current_streak         | integer                  |
| profiles            | last_active_date       | date                     |
| profiles            | last_quiz_generated_at | timestamp with time zone |
| generated_quizzes   | topic                  | text                     |
| generated_quizzes   | difficulty             | text                     |
| exams               | title                  | text                     |
| exams               | short_name             | text                     |
| exams               | icon                   | text                     |
| exams               | color                  | text                     |
| questions           | question_text          | text                     |
| exams               | description            | text                     |
| app_feedback        | status                 | text                     |
| questions           | explanation            | text                     |
| questions           | topic                  | text                     |
| questions           | difficulty             | text                     |
| app_feedback        | admin_reply            | text                     |
| question_reports    | status                 | text                     |
| exam_categories     | icon                   | text                     |
| exams               | conducting_body        | text                     |
| exams               | exam_level             | text                     |
| exams               | recruitment_type       | text                     |
| profiles            | email                  | text                     |
| profiles            | full_name              | text                     |
| profiles            | avatar_url             | text                     |
| exams               | subcategory            | text                     |
| exam_categories     | title                  | text                     |
| question_reports    | question_text          | text                     |
| profiles            | target_exams           | ARRAY                    |
| profiles            | current_focus          | text                     |
| quiz_history        | topic                  | text                     |
| transactions        | type                   | text                     |
| transactions        | description            | text                     |
| quiz_history        | difficulty             | text                     |
| question_reports    | issue_type             | text                     |
| question_reports    | details                | text                     |
| exam_categories     | slug                   | text                     |
| app_feedback        | category               | text                     |
| app_feedback        | message                | text                     |
| exams               | id                     | text                     |