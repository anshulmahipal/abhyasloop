# Deploy app.tyariwale.com on Vercel

The app is **Expo** (React Native) at repo root. Use a **separate** Vercel project from the marketing website.

## 1. Create a new Vercel project (for the app)

- **Import** the same repo (e.g. `abhyasloop` / this repo).
- Or duplicate the existing project and change settings so this one is for the **app** only.

## 2. Project settings (app.tyariwale.com)

In **Settings → General**:

| Setting | Value |
|--------|--------|
| **Root Directory** | Leave **empty** (repo root). |
| **Framework Preset** | **Other** (Expo web export). |
| **Build Command** | `npm run build` (root `vercel.json` sets this). |
| **Output Directory** | `web-build` (root `vercel.json` sets this). |
| **Install Command** | `npm install` (default is fine). |

The repo root **vercel.json** has:

- `buildCommand`: `npm run build` (Expo web export)
- `outputDirectory`: `web-build`
- SPA rewrites: all routes → `/index.html`

## 3. Domain: app.tyariwale.com

- **Settings → Domains** → Add **app.tyariwale.com**.
- Point your DNS to Vercel (e.g. CNAME `app` → `cname.vercel-dns.com` or the value Vercel shows).

## 4. Two projects from one repo (summary)

| Project | Root Directory | Domain | Purpose |
|--------|----------------|--------|--------|
| **App** | *(empty)* | app.tyariwale.com | Expo web export. |
| **Website** | `website` | tyariwale.com | Next.js marketing site. |

After saving settings and redeploying, app.tyariwale.com serves the Expo web build from `web-build/`.
