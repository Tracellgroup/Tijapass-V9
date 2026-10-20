-- Design reference only. NOT APPLIED BY NETLIFY DEPLOYMENT.
-- Apply ONLY after formal review of original schema + v5 + v6 migrations.
-- Critical: enable RLS, private storage policies, authenticated RPC/Edge Functions,
-- server-only idempotency keys, journal constraints and audit-signing before production.
alter table public.accounting_staging
 add column if not exists ai_outcome text,
 add column if not exists ai_rules_version text,
 add column if not exists ai_findings jsonb not null default '[]'::jsonb,
 add column if not exists returned_to_customer_at timestamptz,
 add column if not exists correction_message text,
 add column if not exists resubmitted_at timestamptz;

-- An independent review trail: no direct client insert/update policy.
create table if not exists public.accounting_review_events (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id),
 staging_id uuid references public.accounting_staging(id),
 journal_id uuid references public.journal_headers(id),
 action text not null check(action in (
  'ai_flag','ai_cleared','customer_corrected','returned_to_customer',
  'tfl_approved','tfl_rejected','reversal_requested','reversal_posted',
  'duplicate_evidence_linked')),
 reason text not null,
 prior_values jsonb,
 revised_values jsonb,
 actor_user_id uuid references auth.users(id),
 executed_by text not null check(executed_by in ('customer','tfl_accountant','tfl_supervisor','rules_engine')),
 created_at timestamptz not null default now()
);
create index if not exists accounting_review_events_customer_date on public.accounting_review_events(customer_id,created_at desc);
alter table public.accounting_review_events enable row level security;
-- No direct INSERT/UPDATE/DELETE policy for browser clients. Read permissions only after tenant review.

create table if not exists public.accounting_journal_reversals (
 id uuid primary key default gen_random_uuid(),
 original_journal_id uuid not null references public.journal_headers(id),
 reversing_journal_id uuid not null unique references public.journal_headers(id),
 reason text not null check(length(trim(reason))>=10),
 approved_by uuid not null references auth.users(id),
 approved_at timestamptz not null default now(),
 unique(original_journal_id)
);
alter table public.accounting_journal_reversals enable row level security;
-- The production posting RPC MUST create original and reversing journal records atomically,
-- append audit records and prohibit UPDATE/DELETE of balanced posted journal lines.
