-- TijaPass V6 proposed schema migration. REVIEW in a nonproduction project.
-- Apply AFTER schema.sql and accounting_v5_upgrade.sql. This does not deploy secure application logic.
-- All updates/posting decisions must be enforced by authenticated server code / restricted RPC.
alter table public.accounting_staging
  add column if not exists counterparty text,
  add column if not exists business_purpose text,
  add column if not exists source_provider text,
  add column if not exists source_account_alias text,
  add column if not exists entry_method text,
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists customer_confirmed_by uuid references auth.users(id),
  add column if not exists anomaly_code text,
  add column if not exists anomaly_explanation text,
  add column if not exists anomaly_approved_by uuid references auth.users(id),
  add column if not exists anomaly_approved_at timestamptz,
  add column if not exists uniqueness_explanation text,
  add column if not exists uniqueness_approved_by uuid references auth.users(id),
  add column if not exists linked_to_event_id uuid;

create table if not exists public.accounting_evidence_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  source_staging_id uuid not null references public.accounting_staging(id),
  matched_to_staging_id uuid references public.accounting_staging(id),
  matched_to_journal_id uuid references public.journal_headers(id),
  decision text not null check(decision in ('same_event','distinct_event','unresolved')),
  rationale text not null,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  check ((matched_to_staging_id is not null)::integer + (matched_to_journal_id is not null)::integer = 1),
  unique(source_staging_id,matched_to_staging_id),
  unique(source_staging_id,matched_to_journal_id)
);
create index if not exists idx_v6_evidence_customer on public.accounting_evidence_links(customer_id);
alter table public.accounting_evidence_links enable row level security;
-- By default no browser write grant/policy; implement customer-scoped read policies and server-only write
-- after formal security review. For production: identity-backed customer attestation, immutable journal,
-- idempotent provider imports, multiple account subledgers, unusual amount validation,
-- reviewer separation, evidence-object hashes and tamper-resistant audit records.
