# Testing the generate-quiz Edge Function

## Request Body Format

```json
{
  "topic": "Algebra",
  "difficulty": "medium"
}
```

## Valid Difficulty Values
- `"easy"`
- `"medium"`
- `"hard"`

## Test Examples

### 1. Using cURL (Local Function)
```bash
curl -X POST http://localhost:9999/functions/v1/generate-quiz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "topic": "Algebra",
    "difficulty": "medium"
  }'
```

### 2. Using cURL (Deployed Function)
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-quiz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "topic": "Algebra",
    "difficulty": "medium"
  }'
```

### 3. Using JavaScript/Fetch
```javascript
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/generate-quiz', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer YOUR_ANON_KEY`
  },
  body: JSON.stringify({
    topic: 'Algebra',
    difficulty: 'medium'
  })
});

const data = await response.json();
console.log(data);
```

### 4. Using Supabase Client (from your app)
```typescript
const { data, error } = await supabase.functions.invoke('generate-quiz', {
  body: {
    topic: 'Algebra',
    difficulty: 'medium'
  }
});
```

## Test Cases

### Test Case 1: Basic Request
```json
{
  "topic": "Algebra",
  "difficulty": "medium"
}
```

### Test Case 2: Easy Difficulty
```json
{
  "topic": "Indian Constitution",
  "difficulty": "easy"
}
```

### Test Case 3: Hard Difficulty
```json
{
  "topic": "Mathematics",
  "difficulty": "hard"
}
```

### Test Case 4: Different Topic
```json
{
  "topic": "History",
  "difficulty": "medium"
}
```

## Expected Response

```json
{
  "success": true,
  "questions": [
    {
      "question": "What is...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "medium",
      "explanation": "Explanation text..."
    }
    // ... 4 more questions
  ]
}
```

## Error Responses

### Missing Fields
```json
{
  "error": "Missing topic or difficulty",
  "received": {
    "topic": null,
    "difficulty": null
  }
}
```

### Invalid Difficulty
```json
{
  "error": "Invalid difficulty. Must be easy, medium, or hard",
  "received": "invalid"
}
```

## Quick Test Script

Run the test script:
```bash
chmod +x test-function.sh
./test-function.sh
```

Or test manually:
```bash
# Replace with your actual values
SUPABASE_URL="https://your-project.supabase.co"
ANON_KEY="your-anon-key"

curl -X POST "$SUPABASE_URL/functions/v1/generate-quiz" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d @test-function.json
```
