# Web dev server (localhost:8081)

## Seeing the Auth screen

The Expo app at **http://localhost:8081** uses client-side routing. To see the **auth (login/signup) screen**:

1. Open **http://localhost:8081** (root URL).
2. The app will redirect you to the auth screen so you see the login/signup form.

Do **not** open `http://localhost:8081/auth` directly in the address bar. Many dev servers only serve the app at `/`, so `/auth` can return 404. Always start from the root URL.

## Commands

- **Expo app (web):** `npm run app` or `npm run app:no-ssl-check` (if you hit TLS certificate errors).
- **Static landing (website folder):** `npm start` → http://localhost:3000.
