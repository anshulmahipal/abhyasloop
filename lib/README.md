# Logger Utility

A comprehensive logging utility for debugging React Native Expo apps.

## Features

- ✅ User action logging (button presses with user info)
- ✅ API call tracking (request/response with timing)
- ✅ Grouped console logs for better organization
- ✅ Timestamp tracking
- ✅ Different log levels (info, debug, warn, error)
- ✅ **Debug Mode Only** - Auto-disabled in production (can be manually enabled)

## Debug Mode Behavior

The logger is **enabled by default only in development/debug mode**:

- ✅ **Enabled when:**
  - Running in Expo development mode (`__DEV__ === true`)
  - `NODE_ENV === 'development'`
  
- ❌ **Disabled when:**
  - Production builds
  - Release builds

### Manual Control

You can override the default behavior:

```typescript
logger.enable();  // Force enable (works even in production)
logger.disable(); // Force disable (works even in development)
```

### Enable in Production (Optional)

To enable logging in production for debugging purposes, uncomment the environment variable check in `logger.ts` and set:

```bash
EXPO_PUBLIC_ENABLE_LOGGER=true
```

**Note:** This keeps logs off in production by default for performance and privacy, but allows enabling them when needed for debugging.

## Usage

### Basic Logging

```typescript
import { logger } from '../lib/logger';

logger.info('Info message', { data: 'value' });
logger.debug('Debug message', { debug: 'data' });
logger.warn('Warning message', { warning: 'data' });
logger.error('Error message', error);
```

### User Actions

```typescript
logger.userAction('Button Pressed', {
  id: '123',
  name: 'John Doe',
}, {
  buttonId: 'start-quiz',
  screen: 'dashboard',
});
```

### API Calls

```typescript
logger.apiCall('Fetch Questions', {
  url: '/api/questions',
  method: 'GET',
  params: { difficulty: 'medium' },
  response: { questions: [] },
  duration: 250,
});
```

### Async API Calls (Recommended)

```typescript
const result = await logger.apiCallAsync(
  'Submit Quiz Answer',
  async () => {
    return await fetch('/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ answer: 'A' }),
    }).then(res => res.json());
  },
  {
    url: '/api/quiz/submit',
    method: 'POST',
    body: { answer: 'A' },
    userInfo: { id: '123', name: 'John' },
  }
);
```

### Grouped Logs

```typescript
logger.group('Quiz Flow', () => {
  logger.info('Starting quiz');
  logger.debug('Question loaded');
  logger.warn('Time running low');
});
```

### Enable/Disable

```typescript
logger.enable();  // Enable logging
logger.disable(); // Disable logging
```

## Console Output Example

```
🔵 [14:30:45.123] USER ACTION: Option Selected
  👤 User: Name: John Doe, ID: 123
  📦 Additional Data: { questionId: 1, selectedOption: 2 }

🌐 [14:30:45.456] API CALL START: Submit Answer
  👤 User: Name: John Doe, ID: 123
  📍 URL: /api/quiz/submit
  🔧 Method: POST
  📤 Request Body: { answer: 'A' }
  ⏳ Waiting for API response...

✅ [14:30:46.789] API CALL SUCCESS: Submit Answer
  📥 Response: { success: true }
  ⏱️ Duration: 1333ms
```
