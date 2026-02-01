#!/bin/bash

# Test script for generate-quiz Edge Function
# Usage: ./test-function.sh

SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-https://jpzsowcnufpnjurdvekq.supabase.co}"
SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: EXPO_PUBLIC_SUPABASE_ANON_KEY not set"
  exit 1
fi

FUNCTION_URL="${SUPABASE_URL}/functions/v1/generate-quiz"

echo "Testing generate-quiz function..."
echo "URL: $FUNCTION_URL"
echo ""

# Test 1: Basic request
echo "Test 1: Basic request (Algebra, medium)"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Algebra",
    "difficulty": "medium"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 2: Easy difficulty
echo "Test 2: Easy difficulty"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Indian Constitution",
    "difficulty": "easy"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 3: Hard difficulty
echo "Test 3: Hard difficulty"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Mathematics",
    "difficulty": "hard"
  }' | jq '.'
