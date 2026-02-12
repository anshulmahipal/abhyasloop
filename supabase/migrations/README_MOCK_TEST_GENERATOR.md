# Modular AI Mock Test Generator

## Overview

The Mock Test Generator uses a **Blueprint & Orchestrator** pattern to pre-generate complete exams section-by-section and save them to the database for later retrieval.

## Architecture

### 1. **The Blueprint** (`config/examBlueprints.ts`)
Defines the structure of different exam types. Each blueprint specifies:
- Exam title
- Sections with subject, topic, and question count

### 2. **The Orchestrator** (`supabase/functions/generate-mock-test/index.ts`)
Coordinates the entire generation process:
- Creates the mock test shell
- Creates section records
- Triggers parallel question generation for each section
- Returns immediately while generation continues in background

### 3. **The Worker** (`generateSectionQuestions` function)
Generates questions for a single section by:
- Calling Gemini AI API
- Parsing JSON response
- Saving questions to database

### 4. **The Database**
Three main tables:
- `mock_tests`: Exam metadata
- `test_sections`: Section definitions
- `mock_test_questions`: Individual questions

## Setup Instructions

### Step 1: Run Database Migration

Execute the SQL migration file in Supabase SQL Editor:

```bash
supabase/migrations/create_mock_test_schema.sql
```

This creates:
- `mock_tests` table
- `test_sections` table
- `mock_test_questions` table
- Indexes for performance
- RLS policies
- Triggers for auto-updating status

### Step 2: Deploy Edge Function

```bash
# Deploy the generate-mock-test function
supabase functions deploy generate-mock-test

# Set environment variables
supabase secrets set GEMINI_API_KEY=your_api_key_here
supabase secrets set GEMINI_MODEL=gemini-flash-latest  # Optional
```

### Step 3: Configure Blueprints

Edit `config/examBlueprints.ts` to add/modify exam structures:

```typescript
export const EXAM_BLUEPRINTS = {
  YOUR_EXAM_TYPE: {
    title: "Your Exam Title",
    sections: [
      { subject: "Subject1", topic: "Topic1", count: 10 },
      { subject: "Subject2", topic: "Topic2", count: 15 },
    ],
  },
};
```

## Usage

### Generate a Mock Test

```typescript
import { generateMockTest } from '@/lib/mockTestApi';

// Start generation (returns immediately)
const mockTest = await generateMockTest('UPSC_PRELIMS_MINI');

console.log('Mock test ID:', mockTest.id);
console.log('Status:', mockTest.status); // "BUILDING"
```

### Check Status

```typescript
import { getMockTest, waitForMockTestReady } from '@/lib/mockTestApi';

// Option 1: Check status manually
const mockTest = await getMockTest(mockTestId);
if (mockTest.status === 'READY') {
  // Exam is ready!
}

// Option 2: Poll until ready (with timeout)
try {
  const readyMockTest = await waitForMockTestReady(mockTestId, 60000);
  // Exam is ready!
} catch (error) {
  // Timeout or failed
}
```

### Retrieve Complete Exam

```typescript
import { getMockTestWithDetails } from '@/lib/mockTestApi';

const exam = await getMockTestWithDetails(mockTestId);

// exam.sections[0].questions contains all questions for first section
exam.sections.forEach((section) => {
  console.log(`Section: ${section.subject_name} - ${section.topic_name}`);
  section.questions.forEach((q) => {
    console.log(`Q: ${q.question_text}`);
    console.log(`Options: ${q.options.join(', ')}`);
    console.log(`Correct: ${q.correct_answer}`);
  });
});
```

## API Endpoints

### Generate Mock Test

**POST** `/functions/v1/generate-mock-test`

```json
{
  "examType": "UPSC_PRELIMS_MINI",
  "title": "Optional Custom Title"
}
```

Response:
```json
{
  "success": true,
  "mockTest": {
    "id": "uuid",
    "title": "UPSC Prelims Mini Mock",
    "slug": "upsc_prelims_mini-1234567890",
    "examType": "UPSC_PRELIMS_MINI",
    "status": "BUILDING"
  },
  "message": "Mock test generation started. Check status via API."
}
```

## Database Schema

### mock_tests
- `id` (uuid, primary key)
- `title` (text)
- `slug` (text, unique)
- `exam_type` (text)
- `status` (text: BUILDING | READY | FAILED)
- `created_at`, `updated_at`, `completed_at`

### test_sections
- `id` (uuid, primary key)
- `mock_test_id` (uuid, foreign key)
- `subject_name` (text)
- `topic_name` (text)
- `question_count` (integer)
- `status` (text: PENDING | GENERATING | COMPLETED | FAILED)
- `order_index` (integer)

### mock_test_questions
- `id` (uuid, primary key)
- `section_id` (uuid, foreign key)
- `question_text` (text)
- `options` (jsonb array)
- `correct_answer` (integer: 0-3)
- `explanation` (text)
- `order_index` (integer)

## Status Flow

1. **BUILDING**: Mock test created, sections being generated
2. **READY**: All sections completed successfully
3. **FAILED**: One or more sections failed

Section status flow:
1. **PENDING**: Section created, waiting to be processed
2. **GENERATING**: Questions being generated
3. **COMPLETED**: All questions generated successfully
4. **FAILED**: Generation failed

## Error Handling

- If a section fails, it's marked as FAILED
- If any section fails, the mock test is marked as FAILED
- Error messages are stored in `mock_tests.error_message`
- The system continues processing other sections even if one fails

## Performance Considerations

- Questions are generated in parallel for all sections
- Database triggers automatically update mock test status when all sections complete
- Indexes optimize query performance
- RLS policies ensure secure access

## Future Enhancements

- Add retry logic for failed sections
- Add progress tracking (X/Y sections completed)
- Add webhook notifications when exam is ready
- Add caching for frequently requested exams
- Add exam versioning system
