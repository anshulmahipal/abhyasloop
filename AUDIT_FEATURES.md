# 🔍 App Audit Features & Functions

Comprehensive list of features and functions to help audit your Trivia/AbhyasLoop app.

---

## 📊 **Existing Audit Features**

### 1. **Logger Utility** (`lib/logger.ts`)
**Purpose:** Track user actions, API calls, and errors in development

**Available Functions:**
- `logger.info(message, data?)` - Log informational messages
- `logger.debug(message, data?)` - Log debug information
- `logger.warn(message, data?)` - Log warnings
- `logger.error(message, error?)` - Log errors
- `logger.userAction(action, userInfo?, additionalData?)` - Track user interactions
- `logger.apiCall(action, data)` - Log API calls synchronously
- `logger.apiCallAsync(action, apiFunction, options?)` - Track async API calls with timing
- `logger.group(label, callback)` - Group related logs
- `logger.enable()` - Force enable logging (even in production)
- `logger.disable()` - Disable logging

**Usage Example:**
```typescript
import { logger } from '../lib/logger';

// Track user action
logger.userAction('Quiz Started', {
  id: user.id,
  name: user.name,
}, {
  quizId: '123',
  topic: 'Algebra',
  difficulty: 'medium',
});

// Track API call with timing
await logger.apiCallAsync(
  'Generate Quiz',
  () => generateQuiz(topic, difficulty, userFocus),
  {
    url: '/functions/generate-quiz',
    method: 'POST',
    userInfo: { id: user.id },
  }
);
```

---

### 2. **Database Audit Tables**

#### **quiz_attempts**
**Purpose:** Track all quiz completions and scores

**Auditable Fields:**
- `id` - Unique attempt ID
- `user_id` - User who took the quiz
- `quiz_id` - Reference to generated quiz
- `score` - Correct answers count
- `total_questions` - Total questions in quiz
- `user_answers` - JSONB array of user's selected answers
- `completed_at` - Timestamp of completion

**Audit Queries:**
```sql
-- Get all attempts for a user
SELECT * FROM quiz_attempts 
WHERE user_id = 'user-uuid' 
ORDER BY completed_at DESC;

-- Get average score per user
SELECT user_id, AVG(score::float / total_questions * 100) as avg_score
FROM quiz_attempts 
GROUP BY user_id;

-- Get attempts in date range
SELECT * FROM quiz_attempts 
WHERE completed_at BETWEEN '2025-01-01' AND '2025-02-01';
```

#### **question_reports**
**Purpose:** Track user-reported issues with questions

**Auditable Fields:**
- `id` - Report ID
- `user_id` - User who reported
- `question_text` - The question text
- `issue_type` - Type of issue (e.g., 'incorrect_answer', 'typo', etc.)
- `created_at` - When reported
- `status` - 'pending' or 'resolved'

**Audit Queries:**
```sql
-- Get all reports
SELECT * FROM question_reports 
ORDER BY created_at DESC;

-- Get reports by issue type
SELECT issue_type, COUNT(*) as count 
FROM question_reports 
GROUP BY issue_type;

-- Get unresolved reports
SELECT * FROM question_reports 
WHERE status != 'resolved' OR status IS NULL;
```

#### **mistakes**
**Purpose:** Track questions users got wrong (for learning)

**Auditable Fields:**
- `id` - Mistake ID
- `user_id` - User who made mistake
- `question_id` - Question that was answered incorrectly
- `created_at` - When mistake was recorded

**Audit Queries:**
```sql
-- Get most common mistakes
SELECT question_id, COUNT(*) as mistake_count 
FROM mistakes 
GROUP BY question_id 
ORDER BY mistake_count DESC;

-- Get user's mistake history
SELECT * FROM mistakes 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC;
```

#### **generated_quizzes**
**Purpose:** Track all quiz generation events

**Auditable Fields:**
- `id` - Quiz ID
- `user_id` - User who generated quiz
- `topic` - Quiz topic
- `difficulty` - Difficulty level
- `created_at` - Generation timestamp

**Audit Queries:**
```sql
-- Get quiz generation frequency
SELECT DATE(created_at) as date, COUNT(*) as quizzes_generated
FROM generated_quizzes 
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Get most popular topics
SELECT topic, COUNT(*) as count 
FROM generated_quizzes 
GROUP BY topic 
ORDER BY count DESC;
```

#### **profiles**
**Purpose:** Track user profile data and gamification

**Auditable Fields:**
- `id` - User ID (references auth.users)
- `name` - User name
- `coins` - Gamification coins
- `streak` - Current streak
- `exam_focus` - User's exam focus
- `created_at` - Account creation
- `updated_at` - Last profile update

**Audit Queries:**
```sql
-- Get user engagement metrics
SELECT 
  COUNT(DISTINCT p.id) as total_users,
  AVG(p.coins) as avg_coins,
  AVG(p.streak) as avg_streak
FROM profiles p;

-- Get top users by coins
SELECT name, coins, streak 
FROM profiles 
ORDER BY coins DESC 
LIMIT 10;
```

---

### 3. **Screen-Level Audit Features**

#### **Dashboard** (`app/(protected)/dashboard.tsx`)
- Tracks quiz attempts history
- Displays user stats (total quizzes, avg score, coins)
- Shows recent activity

#### **History** (`app/(protected)/history/index.tsx`)
- Lists all quiz attempts
- Shows quiz topic, difficulty, score, date
- Links to detailed review

#### **Reports** (`app/(protected)/settings/reports.tsx`)
- Shows user's reported questions
- Displays report status (pending/resolved)
- Tracks report timestamps

#### **Profile** (`app/(protected)/profile.tsx`)
- Performance chart (last 10 quizzes)
- User stats and gamification data
- Account information

---

## 🚀 **Suggested Audit Functions to Add**

### 1. **User Activity Audit Function**
```typescript
// lib/audit.ts
export async function getUserActivityAudit(userId: string) {
  const [attempts, reports, mistakes, quizzes] = await Promise.all([
    supabase.from('quiz_attempts').select('*').eq('user_id', userId),
    supabase.from('question_reports').select('*').eq('user_id', userId),
    supabase.from('mistakes').select('*').eq('user_id', userId),
    supabase.from('generated_quizzes').select('*').eq('user_id', userId),
  ]);

  return {
    totalAttempts: attempts.data?.length || 0,
    totalReports: reports.data?.length || 0,
    totalMistakes: mistakes.data?.length || 0,
    totalQuizzesGenerated: quizzes.data?.length || 0,
    attempts: attempts.data,
    reports: reports.data,
    mistakes: mistakes.data,
    quizzes: quizzes.data,
  };
}
```

### 2. **Performance Metrics Function**
```typescript
export async function getPerformanceMetrics(userId: string) {
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('score, total_questions, completed_at')
    .eq('user_id', userId);

  if (!attempts || attempts.length === 0) {
    return null;
  }

  const scores = attempts.map(a => (a.score / a.total_questions) * 100);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);
  
  // Calculate improvement trend
  const recent = attempts.slice(0, 5);
  const older = attempts.slice(5, 10);
  const recentAvg = recent.reduce((sum, a) => sum + (a.score / a.total_questions * 100), 0) / recent.length;
  const olderAvg = older.length > 0 
    ? older.reduce((sum, a) => sum + (a.score / a.total_questions * 100), 0) / older.length 
    : recentAvg;
  const improvement = recentAvg - olderAvg;

  return {
    totalAttempts: attempts.length,
    averageScore: Math.round(avgScore),
    bestScore: Math.round(bestScore),
    worstScore: Math.round(worstScore),
    improvement: Math.round(improvement),
    trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable',
  };
}
```

### 3. **Error Tracking Function**
```typescript
export async function logErrorToDatabase(
  error: Error,
  context: {
    userId?: string;
    screen?: string;
    action?: string;
    additionalData?: Record<string, unknown>;
  }
) {
  // Store errors in a dedicated table (create if doesn't exist)
  const { error: dbError } = await supabase
    .from('error_logs')
    .insert({
      user_id: context.userId,
      error_message: error.message,
      error_stack: error.stack,
      screen: context.screen,
      action: context.action,
      additional_data: context.additionalData,
      created_at: new Date().toISOString(),
    });

  if (dbError) {
    console.error('Failed to log error to database:', dbError);
  }

  // Also log to console via logger
  logger.error('Application Error', {
    error,
    context,
  });
}
```

### 4. **API Performance Audit**
```typescript
export async function getAPIPerformanceMetrics() {
  // This would require storing API call logs in database
  // For now, use logger.apiCallAsync which logs to console
  
  // Suggested: Create api_logs table
  // Fields: id, endpoint, method, duration_ms, status_code, user_id, created_at
  
  const { data } = await supabase
    .from('api_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!data) return null;

  const avgDuration = data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / data.length;
  const errorRate = data.filter(log => log.status_code >= 400).length / data.length * 100;
  
  return {
    totalCalls: data.length,
    averageDuration: Math.round(avgDuration),
    errorRate: Math.round(errorRate * 100) / 100,
    recentCalls: data.slice(0, 10),
  };
}
```

### 5. **Question Quality Audit**
```typescript
export async function getQuestionQualityMetrics(questionId: string) {
  const [mistakes, reports, attempts] = await Promise.all([
    supabase.from('mistakes').select('*').eq('question_id', questionId),
    supabase.from('question_reports').select('*').eq('question_id', questionId),
    supabase.from('quiz_attempts').select('user_answers'),
  ]);

  // Calculate how many users got this question wrong
  const mistakeCount = mistakes.data?.length || 0;
  const reportCount = reports.data?.length || 0;
  
  // Analyze user answers from quiz attempts
  let correctCount = 0;
  let incorrectCount = 0;
  
  attempts.data?.forEach(attempt => {
    // Parse user_answers JSONB to find this question's answer
    // This requires knowing the question index in the quiz
  });

  return {
    mistakeCount,
    reportCount,
    qualityScore: reportCount > 0 ? 'needs_review' : 'good',
  };
}
```

### 6. **User Engagement Audit**
```typescript
export async function getUserEngagementMetrics(userId: string) {
  const [profile, attempts, lastActivity] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('quiz_attempts').select('completed_at').eq('user_id', userId).order('completed_at', { ascending: false }),
  ]);

  const lastQuizDate = attempts.data?.[0]?.completed_at 
    ? new Date(attempts.data[0].completed_at) 
    : null;
  
  const daysSinceLastActivity = lastQuizDate 
    ? Math.floor((Date.now() - lastQuizDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    totalQuizzes: attempts.data?.length || 0,
    currentStreak: profile.data?.streak || 0,
    coins: profile.data?.coins || 0,
    lastActivity: lastQuizDate,
    daysSinceLastActivity,
    engagementLevel: daysSinceLastActivity === null ? 'new' 
      : daysSinceLastActivity === 0 ? 'active'
      : daysSinceLastActivity <= 7 ? 'recent'
      : daysSinceLastActivity <= 30 ? 'inactive'
      : 'dormant',
  };
}
```

### 7. **Database Health Check**
```typescript
export async function auditDatabaseHealth() {
  const checks = {
    totalUsers: 0,
    totalQuizzes: 0,
    totalAttempts: 0,
    totalReports: 0,
    orphanedRecords: 0,
    dataIntegrity: 'ok' as 'ok' | 'warning' | 'error',
  };

  const [users, quizzes, attempts, reports] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('generated_quizzes').select('id', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }),
    supabase.from('question_reports').select('id', { count: 'exact', head: true }),
  ]);

  checks.totalUsers = users.count || 0;
  checks.totalQuizzes = quizzes.count || 0;
  checks.totalAttempts = attempts.count || 0;
  checks.totalReports = reports.count || 0;

  // Check for orphaned quiz_attempts (quiz_id doesn't exist)
  const { data: orphaned } = await supabase
    .from('quiz_attempts')
    .select('id')
    .not('quiz_id', 'in', `(SELECT id FROM generated_quizzes)`);

  checks.orphanedRecords = orphaned?.length || 0;
  
  if (checks.orphanedRecords > 0) {
    checks.dataIntegrity = 'warning';
  }

  return checks;
}
```

---

## 📋 **Quick Audit Checklist**

### **User Activity**
- [ ] Total quiz attempts per user
- [ ] Average score trends
- [ ] Most active users
- [ ] Inactive users (no activity in 30+ days)
- [ ] User retention rate

### **Content Quality**
- [ ] Most reported questions
- [ ] Questions with highest mistake rate
- [ ] Unresolved reports count
- [ ] Question difficulty distribution

### **Performance**
- [ ] API response times
- [ ] Error rates
- [ ] Failed quiz generations
- [ ] Database query performance

### **Gamification**
- [ ] Coins distribution
- [ ] Streak statistics
- [ ] Leaderboard accuracy
- [ ] Reward redemption (if applicable)

### **Security**
- [ ] Failed authentication attempts
- [ ] Unusual user activity patterns
- [ ] Data access violations
- [ ] RLS policy effectiveness

---

## 🛠 **How to Use**

### **Enable Production Logging** (if needed)
```typescript
// In your app initialization
import { logger } from './lib/logger';

// Enable logging in production for debugging
if (process.env.EXPO_PUBLIC_ENABLE_LOGGER === 'true') {
  logger.enable();
}
```

### **Create Audit Dashboard Screen**
Create `app/(protected)/settings/audit.tsx` to display audit metrics using the functions above.

### **Set Up Automated Reports**
Use Supabase Edge Functions or cron jobs to generate weekly/monthly audit reports.

---

## 📝 **Notes**

- Logger is **disabled by default in production** for performance
- Database audit queries require appropriate RLS policies
- Some suggested functions require new database tables (e.g., `error_logs`, `api_logs`)
- Consider adding indexes on frequently queried fields (`user_id`, `created_at`, etc.)
