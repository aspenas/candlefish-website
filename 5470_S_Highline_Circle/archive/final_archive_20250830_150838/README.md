# Modern Architecture Denver — Highline Valuation

Quiet, architectural valuation web app. Tokens → Style Dictionary → Tailwind preset → Next.js (App Router).

## Run locally
```bash
pnpm install
pnpm dev
# open http://localhost:3000/highline
```

## Share gate
- Copy `.env.example` to `.env` and set `MAD_SHARE_PASSPHRASE=your-secret`.
- Start dev: `pnpm dev`
- Share link: `/share/highline` (cookie lasts ~8h).

## Deploy — Vercel
1. Push this repo to GitHub.
2. In Vercel:
   - **Add New… → Project → Import from Git**.
   - **Root Directory**: `apps/mad-valuation-web` (Monorepo setting) — see docs.
   - **Install Command**: `pnpm install`
   - **Build Command**: `pnpm -C ../../packages/mad-tokens build && next build`
   - **Environment Variables**: `MAD_SHARE_PASSPHRASE=...`
   - Deploy.

## Deploy — Cloudflare Pages (SSR)
Cloudflare now supports full-stack Next.js via **next-on-pages**.
```bash
pnpm -C packages/mad-tokens build
pnpm -C apps/mad-valuation-web build:cf
# Then deploy the .vercel output:
cd apps/mad-valuation-web
npx wrangler pages deploy .vercel/output/static --project-name mad-highline
# Set env var in Pages → Settings → Environment Variables: MAD_SHARE_PASSPHRASE
```
References: Next.js on Pages guide + next-on-pages quick start.

## Brand
- Palette: Ink #111111, Bone #F9F7F3, Bronze #C49A6C, Midnight #2F3042, Slate #6B6B6B, Stone #D8D3C7
- Type: Georgia (display), Inter (UI)
- Layout: restrained grid, bronze for emphasis only

## Sources
- CMA Pro Report (REcolorado), Aug 16, 2025 — CP/LP 96.44% across 14 sales ≥ $5M.


## One-click share tokens (HMAC)
- Add env: `MAD_SHARE_TOKEN_SECRET` (long random string)
- Generate token (72h):
  ```bash
  export MAD_SHARE_TOKEN_SECRET='YOUR_LONG_RANDOM_SECRET'
  node -e "const crypto=require('crypto');const s=process.env.MAD_SHARE_TOKEN_SECRET;const p='/share/highline';const exp=Math.floor(Date.now()/1000)+60*60*72;const sig=crypto.createHmac('sha256',s).update(`${p}:${exp}`).digest('base64url');console.log(`${exp}.${sig}`)"
  ```
- Share URL: `https://<domain>/share/highline?t=<exp>.<sig>`
