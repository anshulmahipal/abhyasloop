# Auth email templates

These templates are the source of truth for auth emails. **To use them with Supabase Cloud:**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**.
2. Select the template (e.g. **Confirm signup**) and replace its body with the contents of the matching file here (e.g. `confirm_signup.html`).
3. In **Authentication** → **URL Configuration**, set **Site URL** to your app URL (e.g. `https://app.tyariwale.com`) so `{{ .SiteURL }}` in templates points to your app.

**Confirm signup:** The main CTA links to `{{ .SiteURL }}/auth` (no direct link to Supabase verify) so email prefetchers don’t consume the token; users verify by entering the 6-digit code in the app.

**Reset password:** The main CTA links to `{{ .SiteURL }}/auth/set-password` and shows `{{ .Token }}` (6-digit code) so users can enter the code in the app; same prefetch-safe pattern as confirm signup.
