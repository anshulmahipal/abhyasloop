# Database Migration: Add user_answers to quiz_attempts

## Migration SQL

Run this SQL in your Supabase SQL Editor to add the `user_answers` field to the `quiz_attempts` table:

```sql
-- Add user_answers column to quiz_attempts table
ALTER TABLE quiz_attempts 
ADD COLUMN user_answers JSONB;

-- Add comment to document the field
COMMENT ON COLUMN quiz_attempts.user_answers IS 'Array of user-selected option indices. Format: [0, 2, 1, 3] where each number is the option index (0-3) or -1 for unanswered questions.';
```

## Field Details

- **Type**: JSONB
- **Format**: Array of integers `[0, 2, 1, 3]`
- **Values**: 
  - `0-3`: Selected option index
  - `-1`: Question was not answered
- **Example**: `[0, 2, -1, 3]` means:
  - Question 1: Selected option 0 (A)
  - Question 2: Selected option 2 (C)
  - Question 3: Not answered
  - Question 4: Selected option 3 (D)

## Backward Compatibility

- Existing records will have `NULL` for `user_answers`
- The review screen handles `NULL` gracefully by showing no user selection
- New quiz attempts will always include `user_answers`
