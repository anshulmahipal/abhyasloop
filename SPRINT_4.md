🚀 Sprint 4: The "Alive" Dashboard & Launch
Sprint Goal: currently, your Dashboard is likely empty or static. We want to fetch the user's history so they see their progress immediately after logging in. Then, we will Deploy this to the internet so you can share the link.

📊 Step 1: The "Active" Dashboard
We need to replace the placeholder dashboard with real stats.

Cursor Prompt (Cmd + I in app/(protected)/dashboard.tsx):

"Refactor the Dashboard to show real user activity.

Data Fetching:

Fetch the user's Recent Activity from quiz_attempts (limit to last 5, ordered by completed_at descending).

Join with generated_quizzes to get the topic and difficulty.

Calculate Total Quizzes Taken and Average Score (simple math from the fetched rows).

UI Layout:

Stats Row: Three cards: 'Total Quizzes', 'Average Score', 'Best Streak' (mock streak for now).

Recent Activity List: A scrollable list of past quizzes.

Each item should show: Topic, Score (e.g., 4/5), Date (formatted nicely), and a 'View' button.

Clicking 'View' goes to /result?attemptId=....

New Quiz Button: Keep the big 'Start New Quiz' button at the top or bottom.

Loading State: Show a skeleton loader while fetching."