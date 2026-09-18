-- Openfield · UroPay QR flow (direct UPI, no aggregator)
-- Run in Supabase → SQL Editor AFTER 002. Safe to re-run.
--
-- The QR flow needs two things 002 lacks:
-- 1) submitted_utr — the 12-digit UPI ref the customer pastes after paying.
--    Stored so the companion-SMS webhook (which may arrive with null order
--    ids) can still match the payment to our order row.
-- 2) review / utr_submitted states — UTR_SUBMITTED on paste, REVIEW_REQUIRED
--    when no SMS arrives within ~2 min (manual approve/reject in dashboard).

alter table public.uropay_orders
  add column if not exists submitted_utr text;

-- Widen the status check to the QR lifecycle. The original constraint is
-- auto-named uropay_orders_status_check; drop-if-exists then re-add.
alter table public.uropay_orders
  drop constraint if exists uropay_orders_status_check;

alter table public.uropay_orders
  add constraint uropay_orders_status_check
  check (status in ('pending', 'utr_submitted', 'review', 'paid', 'failed', 'expired', 'cancelled'));

create index if not exists uropay_orders_utr_idx
  on public.uropay_orders (submitted_utr) where submitted_utr is not null;
