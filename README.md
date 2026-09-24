# Openfield — the open Higgsfield studio

> One prompt bar for cinematic AI image + video across 44 Higgsfield models. Supabase sign-in. Pay per generation in tokens via UroPay. MIT.

Built for the **$50K Higgsfield-competitor challenge**: the open-source Higgsfield studio ([wide-trace/open-higgsfield](https://github.com/wide-trace/open-higgsfield)) — 38-model catalog, one-composer studio, server-actions-only generation (`POST /{model}`, `GET /requests/{id}/status`), Zustand + IndexedDB, masonry gallery + viewer — extended with Supabase auth, token billing, and UroPay checkout. Generation runs **only** on the official Higgsfield API.

## How money works

- **1 token = $0.01** of Higgsfield API cost. Rates mirror the official API card (`src/lib/credits/pricing.ts` — the one file to adjust if your key carries different rates).
- Example — 720p · 16:9 · 30s: Seedance 2.5 → **260 tokens** (~$2.60) · Kling 3.0 → **126** (~$1.26) · Wan 3.0 Prime → **143** · MiniMax H3 → **215** · Soul 2 image → **1**.
- Tokens spend on submit, **refund automatically** if the platform never queues the request. Tokens never expire.
- Packs (INR, via UroPay): ₹199 → 200 · ₹499 → 550 · ₹1499 → 1800 · ₹4999 → 6500.

## Routes

- `/` — editorial landing
- `/pricing` — token packs (UroPay checkout) + full per-model rate card, comparison, FAQ
- `/login` — Supabase sign-in (magic link · password · Google) + reset flow
- `/onboarding` — first-visit quiz (use case, referral, experience, optional DOB) before the studio
- `/studio` — gated studio (44 Higgsfield models, live token balance in the top bar)
- `/studio/billing` — balance, UroPay order history, per-order status
- `/billing/payment/[tenantRef]` — server-authoritative payment status (waiting / submitted / verifying / paid / failed / expired / cancelled / not found / unavailable), self-polling
- `/studio/security` — opt-in TOTP second factor
- `/mcp` — public MCP setup guide for Cursor, Claude, Windsurf, VS Code, Cline, Claude Code, Codex, Continue, and generic HTTP clients

## Security model

- Sign-in (+ confirmed email for paid routes) required for all generation, uploads, checkout, and billing reads.
- The single operator Higgsfield key (`HF_API_KEY`) is server-only; the browser never touches provider credentials.
- Per-user/per-IP rate limits on submits, polls, uploads, and checkout; 256 MB upload cap; CSP + HSTS + anti-clickjacking headers.
- UroPay webhook verifies HMAC-SHA256 + timestamp freshness + event-id replay guard, then treats `GET /v1/orders` as authoritative before crediting — idempotent on re-delivery.
- One crediting path (`src/lib/billing/confirm.ts`) for the webhook and for status polling, idempotent on the unique ledger ref `topup:<tenant_ref>`.
- Payment status pages decide nothing: the reference in the URL only selects an order. Ownership is enforced in SQL (`get_my_order` filters on `auth.uid()`), so another user's reference returns no row — and a provider outage reads as "we could not check", never as "payment failed".
- `GET /auth/callback` only redirects same-origin `next` targets. CI (`.github/workflows/security.yml`) runs `npm ci`, `npm audit`, a secret scan, typecheck, and migration filename validation.

## Setup (5 min)

```bash
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3000
```

Fill `.env.local` (same vars go in Vercel → Project → Settings → Environment Variables):

1. **Supabase** (sign-in + billing): [supabase.com](https://supabase.com) → new project → Settings → API → `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (server-only, powers wallets/ledger). Run `supabase/migrations/001_generations.sql` then `002_credits.sql` in SQL Editor. Auth → URL Configuration → Redirect to `http://localhost:3000/auth/callback` (+ your Vercel URL later). Enable Google provider optionally.
2. **Higgsfield operator key**: `HF_API_KEY=id:secret` (server-only, from the Higgsfield team / console). `HF_API_BASE_URL` defaults to `https://api.higgsfield.ai`.
3. **UroPay** (hosted checkout, same scheme as MUN-AI-APP): `UROPAY_API_KEY` + `UROPAY_API_SECRET` + `UROPAY_WEBHOOK_SECRET` from the UroPay dashboard (server-only). Apply the migrations in `supabase/migrations/` in version order. The UroPay and billing-hardening migrations use the timestamp versions already recorded by the database; do not rename or renumber applied migrations. Set the dashboard webhook URL to `https://<your-app>.vercel.app/api/uropay/webhook`.
4. **Uploads**: reference frames go to the Supabase Storage bucket `openfield-uploads` (created public by migration 001) — no extra env needed.
5. **MCP generation**: visit `/mcp` for the public setup guide. `openfield_models` and `openfield_pricing` are read-only. `openfield_generate` calculates the request cost, checks the user's wallet, atomically deducts the required tokens, and only then starts the official Higgsfield request; failed submits are refunded.

```bash
npm run build && npm run start
```

## Deploy (Vercel)

1. Push to `sahajiscoding/openfield`, Import in Vercel.
2. Env vars: same as `.env.example` (only `NEXT_PUBLIC_*` reach the browser).
3. Supabase → Auth → Redirect URLs: add `https://<your-app>.vercel.app/auth/callback`.
4. UroPay dashboard → webhook URL: `https://<your-app>.vercel.app/api/uropay/webhook`.
5. Demo script for the QT: sign in → buy Starter pack on the hosted checkout → Seedance 2.5 720p → watch 260 tokens spend → order lands in `/studio/billing`.

## Design ($10K checklist)

Dark cinematic editorial, committed end-to-end. Syne display + Space Grotesk body (never Inter/Roboto). 4 colors: void `#08090a`, bone `#EDEAE0`, lime `#D4F921`, smoke. Masonry gallery, hand-tuned micro-motion + scroll reveals, distinct mobile layout (bottom-sheet composer, 1-col grids), semantic HTML, keyboard-first (arrows/Home/End/Esc/`⌘⏎`), AA contrast, sub-2s first paint.

## License

MIT. Upstream credits in `/` → Open source section.
