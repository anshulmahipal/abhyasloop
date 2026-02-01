🚀 Sprint 3: Gameplay & Results
Sprint Goal: Allow the user to select answers, calculate their score, save the attempt to the database, and view a Result Screen with analysis.

✅ Step 1: Create the "Attempts" Table
We need a place to store the user's score and answers.

Action: Go to Supabase SQL Editor and run this:

SQL
-- 1. Create the Attempts table
create table quiz_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  quiz_id uuid references generated_quizzes not null,
  score integer not null,
  total_questions integer not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Security
alter table quiz_attempts enable row level security;

create policy "Users can insert their own attempts" 
on quiz_attempts for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can view their own attempts" 
on quiz_attempts for select 
using (auth.uid() = user_id);
🎮 Step 2: Handle "Quiz Submission"
We need to update the Quiz Screen to calculate the score locally and save it when the user finishes.

Cursor Prompt (Cmd + I in app/(protected)/quiz/[id].tsx):

"Update the Quiz Screen to handle submission.

Track Answers: Create a state userAnswers (array of selected indices).

Calculate Score: When the user clicks 'Finish':

Compare userAnswers with questions[i].correct_index.

Count the correct answers.

Save to DB:

Insert a new row into quiz_attempts with quiz_id, user_id, score, and total_questions.

Navigate:

On success, go to /result?attemptId=... (pass the new ID).

Use router.replace so they can't go back to the quiz."

🏆 Step 3: The Result Screen
Finally, let's build the report card.

Cursor Prompt (Cmd + I in app/(protected)/result.tsx):

"Build the Result Screen.

Params: Read attemptId from the URL parameters.

Fetch Data:

Fetch the quiz_attempts row to get the score.

Fetch the related generated_quizzes (topic/difficulty).

UI:

Big Score Card (e.g., 'You scored 4/5').

A circular progress bar (if easy, otherwise just text).

A 'Back to Dashboard' button.

Confetti: (Optional) Add a simple confetti effect if the score is > 80%."