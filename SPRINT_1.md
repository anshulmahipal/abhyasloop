🚀 Sprint 1: Web App Foundation & Core Flow
Sprint Goal: Initialize the "AbhyasLoop" web application using Expo Router, establish the navigation structure (Sitemap), and build the functional Quiz UI with mock data.

Tech Stack:

Framework: React Native Expo (Web Optimized)

Router: Expo Router (File-based routing)

Language: TypeScript

Styling: StyleSheet / React Native Web

Database: Mock JSON (Phase 1), Supabase (Phase 2)

📌 Sitemap & Flow
/ (index) -> Landing Page (Public)

/auth -> Login/Signup Screen

/dashboard -> User Home (Protected)

/quiz/config -> Select Topic/Difficulty

/quiz/[id] -> The Active Quiz Runner

/result -> Score & Analysis

✅ Task List (Execute in Order)
🔹 Task 1: Project Initialization & Clean Up
Objective: Clean the default Expo template and set up web dependencies.

Action:

Ensure react-dom, react-native-web, and @expo/metro-runtime are installed.

Delete the default app/(tabs) directory if it exists. We want a clean Stack layout.

Update app/_layout.tsx to use a standard Stack.

🔹 Task 2: Folder Structure & Routing (The Skeleton)
Objective: Create the empty screens to verify navigation flow.

Action: Create the following file structure with simple <Text>Page Name</Text> placeholders:

app/index.tsx

app/(auth)/login.tsx

app/(protected)/_layout.tsx (Add logic: If not logged in, just render slot for now, we will add auth guard later).

app/(protected)/dashboard.tsx

app/(protected)/quiz/config.tsx

app/(protected)/quiz/[id].tsx

app/(protected)/result.tsx

🔹 Task 3: The Landing Page UI
Objective: Build a high-converting landing page at app/index.tsx.

Requirements:

Hero Section: Big Text "Master Govt Exams with Infinite Practice".

CTA Button: "Start Practicing" (Links to /auth/login).

Features: Grid of 3 cards (AI Logic, Exam Patterns, Instant Results).

Responsiveness: Must look good on Mobile and Desktop (max-width: 800px container).

🔹 Task 4: The Mock Data Engine
Objective: Create the data layer without a backend.

Action:

Create data/mockQuestions.json.

Add 5 sample questions with fields: id, question, options (array), correctIndex, difficulty, explanation.

Create a TypeScript interface Question in types/index.ts that matches this JSON.

🔹 Task 5: The Quiz Runner (Core Feature)
Objective: Build app/(protected)/quiz/[id].tsx.

Requirements:

State: Manage currentIndex, selectedOption, score, timer.

UI: Display the Question text and 4 TouchableOpacity options.

Interaction: Clicking an option highlights it. Clicking "Next" moves to the next Q.

End Game: When the last question is done, navigate to /result with params { score: x, total: y }.

🔹 Task 6: The Result Screen
Objective: Build app/(protected)/result.tsx.

Requirements:

Read score from navigation params.

Display a large Scorecard (e.g., "3/5").

Add "Back to Dashboard" button (Links to /dashboard).

Add "Retry" button (Resets quiz).