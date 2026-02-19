/**
 * Shared auth redirect URLs for Supabase flows (signup, forgot password, etc.).
 * Add these to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   - {getAppUrl()}/auth          (email confirmation, magic link)
 *   - {getAppUrl()}/auth/set-password  (forgot password recovery link)
 */
export function getAppUrl(): string {
  const url =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_URL?.trim()
      ? process.env.EXPO_PUBLIC_APP_URL.trim().replace(/\/$/, '')
      : 'https://app.tyariwale.com';
  return url;
}

/** Base URL for auth redirects (e.g. email confirmation). */
export function getAuthRedirectBaseUrl(): string {
  return `${getAppUrl()}/auth`;
}

/** URL where recovery (forgot password) link should redirect — set new password screen. */
export function getAuthSetPasswordRedirectUrl(): string {
  return `${getAppUrl()}/auth/set-password`;
}
