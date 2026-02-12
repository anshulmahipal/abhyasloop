# Deploy TyariWale website to Vercel

The error `The file "/vercel/path0/website/routes-manifest.json" couldn't be found` means **Root Directory is not set to `website`**. Next.js writes that file to `.next/` inside the app folder, so Vercel must use `website` as the project root.

## Fix (required in Vercel dashboard)

1. Open your **Vercel project** → **Settings** → **General**.
2. Find **Root Directory**.
3. Click **Edit**, enter: **`website`**, then **Save**.
4. Leave **Output Directory** empty (do not set it to `website`).
5. **Redeploy**: Deployments → ⋮ on latest deployment → **Redeploy**.

After this, the build runs from `website/`, creates `website/.next/`, and Vercel finds `routes-manifest.json` at `website/.next/routes-manifest.json`.

## Two projects from one repo

- **Main app (Expo/Vite):** one Vercel project with Root Directory left **empty** (uses root `vercel.json`).
- **Marketing site (Next.js):** a **separate** Vercel project, same repo, with Root Directory set to **`website`**.
