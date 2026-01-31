# AbhyasLoop

A React Native Expo web application for mastering government exams with infinite practice.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Press `w` to open in web browser

## Project Structure

```
app/
  _layout.tsx          # Root layout with Stack navigation
  index.tsx            # Landing page
  (auth)/
    _layout.tsx        # Auth layout
    login.tsx          # Login/Signup screen
  (protected)/
    _layout.tsx        # Protected routes layout (with auth guard)
    dashboard.tsx      # User home
    quiz/
      _layout.tsx      # Quiz routes layout
      config.tsx       # Select Topic/Difficulty
      [id].tsx         # Active Quiz Runner
    result.tsx         # Score & Analysis
```

## Tech Stack

- React Native Expo (Web Optimized)
- Expo Router (File-based routing)
- TypeScript
- StyleSheet / React Native Web

## Debugging & Logging

The project includes a comprehensive logger utility (`lib/logger.ts`) for debugging:

### Logger Features

- ✅ User action logging (button presses with user info)
- ✅ API call tracking (request/response with timing)
- ✅ Grouped console logs for better organization
- ✅ Timestamp tracking
- ✅ Different log levels (info, debug, warn, error)

### Debug Mode Behavior

**The logger is enabled by default only in development/debug mode:**

- ✅ **Enabled when:**
  - Running in Expo development mode (`__DEV__ === true`)
  - `NODE_ENV === 'development'`
  
- ❌ **Disabled when:**
  - Production builds
  - Release builds

### Usage Example

```typescript
import { logger } from '../lib/logger';

// Log user actions
logger.userAction('Button Pressed', {
  id: '123',
  name: 'John Doe',
}, {
  buttonId: 'start-quiz',
});

// Log API calls
await logger.apiCallAsync(
  'Fetch Questions',
  async () => fetch('/api/questions'),
  {
    url: '/api/questions',
    method: 'GET',
    userInfo: { id: '123', name: 'John' },
  }
);
```

### Manual Control

```typescript
logger.enable();  // Force enable (works even in production)
logger.disable(); // Force disable (works even in development)
```

**Note:** Logs are automatically disabled in production for performance and privacy. See `lib/README.md` for complete documentation.
