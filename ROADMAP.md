# 🚀 AbhyasLoop Product Roadmap

## ✅ Phase 1: The Foundation (Current)
- [x] **Quiz Engine:** Topic selection, Difficulty toggle.
- [x] **Content:** Integrated UPSC, SSC, JEE, NEET syllabus structure.
- [x] **Community:** "Rescue Modal" showing other users' sets during downtime.
- [x] **History:** Full audit trail of past attempts (Questions + User Answers).
- [x] **Feedback:** "Report Question" flow with admin dashboard support.
- [x] **Smart Review:** "Mistakes" table tracking incorrect answers.
- [x] **Analytics:** "Time Taken" tracking per question.

---

## ⚔️ Phase 2: Competition & Social (Next)
**Goal:** Increase Daily Active Users (DAU) through FOMO and social proof.

### 1. The "Mistake Loop" Screen
- **Action:** Create `app/(protected)/mistakes.tsx`.
- **Logic:** Fetch from `mistakes` table.
- **Feature:** "Practice My Mistakes" button -> Generates a quiz ONLY from this table.

### 2. Leaderboards
- **Action:** Create `app/(protected)/leaderboard.tsx`.
- **Logic:** Ranking based on `Weekly XP`.
- **Filters:** Global | City | Friend List.

### 3. Shareable Score Cards
- **Action:** On Result screen, add "Share to WhatsApp".
- **Asset:** Generate an image with "I scored 9/10 in Physics on AbhyasLoop! Can you beat me?".

---

## 🧠 Phase 3: Deep Coaching (The Differentiator)
**Goal:** Replace the physical tutor.

### 1. "Snap Solve" (Vision AI)
- **Tech:** Integrate Gemini Pro Vision.
- **Flow:** Camera -> Photo of Book Question -> AI Solves it -> AI Generates 3 similar practice Qs.

### 2. Performance Graphs
- **UI:** Spider Chart (Radar Chart) on Profile.
- **Data:** Strength vs. Weakness (e.g., strong in Algebra, weak in Geometry).

### 3. PYQ (Previous Year Questions) Tagging
- **Data:** Tag questions with `year_asked` (e.g., "JEE 2023").
- **Filter:** "Only ask me real exam questions."

---

## 🛡️ Technical Audit Points (Maintenance)
1.  **Rate Limiting:** Monitor `generate-quiz` usage. If costs rise, implement stricter quotas per user tier.
2.  **Data Pruning:** The `mistakes` table will grow fast. Implement a cron job to archive mistakes older than 6 months.
3.  **Search Indexing:** Add PostGIS or simple text search to `questions` to avoid generating duplicates.