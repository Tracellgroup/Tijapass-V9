-- TIJAPASS V5 ACCOUNTING EXTENSION (illustrative production design; developer/security review required)
-- Apply AFTER the V4 schema, in a non-production test project first.
-- Never grant browser clients INSERT/UPDATE/DELETE to posted accounting journals.

create table if not exists public.accounting_source_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  source_type text not null check(source_type in ('bank_csv','mobile_csv','xlsx','manual','receipt','api_verified','wallet_internal')),
  file_path text, sha256 text, provider_name text, account_mask text,
  consent_id uuid references public.consents(id),
  coverage_start date, coverage_end date, source_opening_balance numeric(18,2), source_closing_balance numeric(18,2),
  reconciliation_status text not null default 'pending',
  ingested_by uuid references auth.users(id), ingested_at timestamptz not null default now(),
  external_verified_at timestamptz
);
create table if not exists public.accounting_staging (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  source_document_id uuid references public.accounting_source_documents(id),
  booking_date date not null, description text not null, reference text, amount numeric(18,2) not null check(amount>0),
  direction text not null check(direction in ('income','expense')), source_account text,
  proposed_account text, proposed_category text, confidence numeric(5,2) check(confidence between 0 and 100),
  model_version text, model_explanation text, raw_record jsonb,
  fingerprint text not null, status text not null default 'pending_review',
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(customer_id,fingerprint)
);
create table if not exists public.gl_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id), account_code text not null,
  account_name text not null, account_type text not null,
  created_at timestamptz not null default now(), unique(customer_id,account_code)
);
create table if not exists public.journal_headers (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id),
  staging_id uuid unique references public.accounting_staging(id), document_id uuid references public.accounting_source_documents(id),
  posting_date date not null, description text not null, reference text, origin_type text not null,
  status text not null default 'posted' check(status in ('posted','reversed')),
  created_by uuid not null references auth.users(id), approved_by uuid not null references auth.users(id),
  posted_at timestamptz not null default now(),reversal_of uuid references public.journal_headers(id)
);
create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),journal_id uuid not null references public.journal_headers(id),
  account_id uuid not null references public.gl_accounts(id),
  debit numeric(18,2) not null default 0 check(debit>=0),
  credit numeric(18,2) not null default 0 check(credit>=0),
  check((debit=0 and credit>0) or (credit=0 and debit>0))
);
create table if not exists public.account_reconciliations (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id),
  source_document_id uuid references public.accounting_source_documents(id),
  account_id uuid references public.gl_accounts(id),
  period_start date, period_end date, source_closing numeric(18,2), ledger_closing numeric(18,2),
  difference numeric(18,2), status text not null default 'open',
  matched_by uuid references auth.users(id), reviewed_by uuid references auth.users(id), reviewed_at timestamptz
);
create table if not exists public.accounting_classification_feedback (
  id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),
  merchant_token text not null, suggested_account text,approved_account text,
  approved_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create index if not exists idx_accounting_staging_customer_date on public.accounting_staging(customer_id,booking_date);
create index if not exists idx_journal_header_customer_date on public.journal_headers(customer_id,posting_date);
create index if not exists idx_accounting_source_customer on public.accounting_source_documents(customer_id);

alter table public.accounting_source_documents enable row level security;
alter table public.accounting_staging enable row level security;
alter table public.gl_accounts enable row level security;
alter table public.journal_headers enable row level security;
alter table public.journal_lines enable row level security;
alter table public.account_reconciliations enable row level security;
alter table public.accounting_classification_feedback enable row level security;

create policy "acc-src-own-or-tfl" on public.accounting_source_documents for select to authenticated
using(customer_id in (select public.current_customer_ids()) or public.is_tfl_user());
create policy "acc-staging-own-or-tfl" on public.accounting_staging for select to authenticated
using(customer_id in (select public.current_customer_ids()) or public.is_tfl_user());
create policy "acc-accounts-own-or-tfl" on public.gl_accounts for select to authenticated
using(customer_id in (select public.current_customer_ids()) or public.is_tfl_user());
create policy "acc-journal-own-or-tfl" on public.journal_headers for select to authenticated
using(customer_id in (select public.current_customer_ids()) or public.is_tfl_user());
create policy "acc-lines-via-journal" on public.journal_lines for select to authenticated
using(journal_id in (select id from public.journal_headers where customer_id in (select public.current_customer_ids()) or public.is_tfl_user()));
create policy "acc-recon-own-or-tfl" on public.account_reconciliations for select to authenticated
using(customer_id in (select public.current_customer_ids()) or public.is_tfl_user());
create policy "acc-feedback-tfl" on public.accounting_classification_feedback for select to authenticated
using(public.is_tfl_user());

-- Production tasks for developer: server-only controlled journal posting transaction; enforce sum(debits)=sum(credits)
-- on commit with a DEFERRABLE constraint trigger or restricted posting RPC; validate account/customer ownership;
-- maker-checker; immutable posted records and reversing entries; source digest verification;
-- multi-channel reconciliation & duplicate detection; period lock, audit log, backups & monitoring;
-- approved FI statement access only with live consent, charging and time-limited grants.
