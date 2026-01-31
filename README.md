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
