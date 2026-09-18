# Openfield — the open-source Higgsfield alternative

> One prompt bar for cinematic AI image + video. Supabase sign-in. Your API key, pasted later. MIT.

Built for the **$50K Higgsfield-competitor challenge**: fuses the two open-source starters into one deployable studio with a $10K-checklist UI.

| Upstream | What Openfield takes |
|---|---|
| [wide-trace/open-higgsfield](https://github.com/wide-trace/open-higgsfield) | 38-model catalog, one-composer studio, server-actions-only generation (`POST /{model}`, `GET /requests/{id}/status`, `Authorization: Key id:secret`), Zustand + IndexedDB, Vercel Blob uploads, masonry gallery + viewer |
| [anil-matcha/open-generative-ai](https://github.com/anil-matcha/open-generative-ai) | MuAPI gateway pattern (`x-api-key`, submit → poll `/predictions/{id}/result`), dual-mode T2I/I2I + T2V/I2V thinking, multi-image inputs, lip-sync studio inputs |

## Routes

- `/` — editorial landing (Higgsfield-fluent, $10K checklist)
- `/pricing` — free studio + pay-providers-directly tiers, comparison, FAQ
- `/byok` — bring-your-own-key guide with live per-browser key status
- `/login` — Supabase sign-in (magic link · password · Google) + reset flow
- `/studio` — gated studio: **Higgsfield · 38** tab + **MuAPI · 400+** tab
- `/studio/security` — opt-in TOTP second factor, key hygiene notes

## Security model

- Sign-in required for all generation, uploads, and key management (server-verified session + confirmed email for paid routes).
- Provider keys live in `httpOnly`/`Secure`/`SameSite=Lax` cookies, called only from server actions, wiped on sign-out.
- Per-user/per-IP rate limits on submits, polls, and uploads; 256 MB upload cap; CSP + HSTS + anti-clickjacking headers.
- `GET /auth/callback` only redirects same-origin `next` targets. CI (`.github/workflows/security.yml`) runs `npm ci`, `npm audit`, a secret scan, and typecheck.

## Setup (5 min)

```bash
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3000
```

Fill `.env.local`:

1. **Supabase** (required for sign-in): [supabase.com](https://supabase.com) → new project → Settings → API → `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Run `supabase/migrations/001_generations.sql` in SQL Editor. Set Auth → URL Configuration → Redirect to `http://localhost:3000/auth/callback` ( + your Vercel URL later). Enable Google provider optionally.
2. **Generation keys — paste later, app runs without them:**
   - `HF_API_BASE_URL=` — Higgsfield-compatible origin (server-only). In-studio: **Add key** → `id:secret` (httpOnly cookie).
   - `MUAPI_API_KEY=` (optional server default) + `MUAPI_BASE_URL=https://api.muapi.ai` — or paste per-user in Studio → MuAPI tab → **MuAPI key**.
   - `OPEN_HIGGSFIELD_READ_WRITE_TOKEN=` (optional) — Vercel Blob uploads. If empty, `/api/blob` 503s and uploads fall back to Supabase `openfield-uploads` bucket.

```bash
npm run build && npm run start
```

## Deploy (Vercel)

1. Push to `sahajiscoding/openfield`, Import in Vercel.
2. Env vars: same as `.env.example` (only `NEXT_PUBLIC_*` reach the browser).
3. Supabase → Auth → Redirect URLs: add `https://<your-app>.vercel.app/auth/callback`.
4. Demo script for the QT: sign in → Higgsfield tab → Add key → Seedance 2.5 → generate → MuAPI tab → Veo 3 → generate.

## Design ($10K checklist)

Dark cinematic editorial, committed end-to-end. Syne display + Space Grotesk body (never Inter/Roboto). 4 colors: void `#08090a`, bone `#EDEAE0`, lime `#D4F921`, smoke. Masonry gallery, hand-tuned micro-motion + scroll reveals, distinct mobile layout (bottom-sheet composer, 1-col grids), semantic HTML, keyboard-first (arrows/Home/End/Esc/`⌘⏎`), AA contrast, sub-2s first paint.

## License

MIT. Upstream credits in `/` → Open source section.
